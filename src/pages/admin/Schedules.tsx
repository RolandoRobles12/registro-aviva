// src/pages/admin/Schedules.tsx - NUEVA PÁGINA DEDICADA A HORARIOS
import React, { useState, useEffect } from 'react';
import { useAuth, usePermissions } from '../../contexts/AuthContext';
import { ScheduleService } from '../../services/schedules';
import { LoadingSpinner, Alert, Button, Select } from '../../components/ui';
import { PRODUCT_TYPES } from '../../utils/constants';
import { ProductSchedule, ProductType } from '../../types';
import { 
  ClockIcon, 
  CheckCircleIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function AdminSchedules() {
  const { user } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const [schedules, setSchedules] = useState<ProductSchedule[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductType>('BA');
  const [currentSchedule, setCurrentSchedule] = useState<ProductSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  useEffect(() => {
    if (schedules.length > 0) {
      const schedule = schedules.find(s => s.productType === selectedProduct);
      setCurrentSchedule(schedule || null);
    }
  }, [selectedProduct, schedules]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const allSchedules = await ScheduleService.getAllSchedules();
      setSchedules(allSchedules);
    } catch (error) {
      console.error('Error loading schedules:', error);
      setError('Error cargando horarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentSchedule) return;
    
    try {
      setSaving(true);
      setError(null);
      await ScheduleService.saveProductSchedule(currentSchedule);
      setSuccess('Horario guardado correctamente');
      await loadSchedules();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving schedule:', error);
      setError('Error guardando horario');
    } finally {
      setSaving(false);
    }
  };

  const updateScheduleField = (field: string, value: any) => {
    if (!currentSchedule) return;
    
    const keys = field.split('.');
    const newSchedule = { ...currentSchedule };
    
    if (keys.length === 2) {
      (newSchedule as any)[keys[0]][keys[1]] = value;
    } else {
      (newSchedule as any)[field] = value;
    }
    
    setCurrentSchedule(newSchedule);
  };

  const toggleWorkDay = (day: number) => {
    if (!currentSchedule) return;
    
    const workDays = [...currentSchedule.workDays];
    const index = workDays.indexOf(day);
    
    if (index > -1) {
      workDays.splice(index, 1);
    } else {
      workDays.push(day);
      workDays.sort();
    }
    
    setCurrentSchedule({ ...currentSchedule, workDays });
  };

  const daysOfWeek = [
    { value: 0, label: 'Domingo', shortLabel: 'D' },
    { value: 1, label: 'Lunes', shortLabel: 'L' },
    { value: 2, label: 'Martes', shortLabel: 'M' },
    { value: 3, label: 'Miércoles', shortLabel: 'Mi' },
    { value: 4, label: 'Jueves', shortLabel: 'J' },
    { value: 5, label: 'Viernes', shortLabel: 'V' },
    { value: 6, label: 'Sábado', shortLabel: 'S' }
  ];

  const productOptions = Object.entries(PRODUCT_TYPES).map(([key, label]) => ({
    value: key,
    label
  }));

  // Only super admins can access schedule configuration
  if (!isSuperAdmin()) {
    return (
      <div className="min-h-64 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Acceso Restringido
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Solo los Super Administradores pueden configurar horarios.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Cargando horarios...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Configuración de Horarios
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Configura horarios de trabajo, días laborales y tolerancias por tipo de producto.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {user?.name}
              </div>
              <div className="text-xs text-red-600 font-medium">
                Super Admin
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert type="success" message={success} dismissible onDismiss={() => setSuccess(null)} />
      )}
      
      {error && (
        <Alert type="error" message={error} dismissible onDismiss={() => setError(null)} />
      )}

      {/* Schedule Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(PRODUCT_TYPES).map(([key, label]) => {
          const schedule = schedules.find(s => s.productType === key);
          return (
            <div 
              key={key} 
              className={`bg-white rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedProduct === key ? 'ring-2 ring-primary-500 border-primary-200' : ''
              }`}
              onClick={() => setSelectedProduct(key as ProductType)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">{label}</h3>
                {schedule ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              {schedule ? (
                <div className="text-xs text-gray-600 space-y-1">
                  <p>🕐 {schedule.schedule.entryTime} - {schedule.schedule.exitTime}</p>
                  <p>🍽️ {schedule.schedule.lunchStartTime} ({schedule.schedule.lunchDuration}min)</p>
                  <p>📅 {schedule.workDays.length} días laborales</p>
                  <p>⏰ {schedule.toleranceMinutes}min tolerancia</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Sin configurar</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Configuration Form */}
      {currentSchedule ? (
        <div className="space-y-6">
          {/* Product Header */}
          <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-primary-900">
                  Configurando: {PRODUCT_TYPES[currentSchedule.productType]}
                </h2>
                <p className="text-sm text-primary-700">
                  Ajusta los horarios y días laborales para este tipo de producto
                </p>
              </div>
              <Button
                onClick={handleSave}
                loading={saving}
                leftIcon={<CheckCircleIcon className="h-4 w-4" />}
              >
                Guardar Cambios
              </Button>
            </div>
          </div>

          {/* Work Days */}
          <div className="bg-white rounded-lg p-6 border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Días Laborales</h3>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {daysOfWeek.map(day => (
                <div key={day.value} className="text-center">
                  <label className="inline-flex flex-col items-center cursor-pointer">
                    <span className="text-xs text-gray-600 mb-1">{day.shortLabel}</span>
                    <input
                      type="checkbox"
                      checked={currentSchedule.workDays.includes(day.value)}
                      onChange={() => toggleWorkDay(day.value)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-xs text-gray-500 mt-1">{day.label}</span>
                  </label>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={currentSchedule.worksOnHolidays}
                  onChange={(e) => updateScheduleField('worksOnHolidays', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium">Trabaja en días feriados</span>
              </label>
            </div>
          </div>

          {/* Schedule Times */}
          <div className="bg-white rounded-lg p-6 border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Horarios de Trabajo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de Entrada
                  </label>
                  <input
                    type="time"
                    value={currentSchedule.schedule.entryTime}
                    onChange={(e) => updateScheduleField('schedule.entryTime', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de Comida
                  </label>
                  <input
                    type="time"
                    value={currentSchedule.schedule.lunchStartTime}
                    onChange={(e) => updateScheduleField('schedule.lunchStartTime', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duración de Comida (minutos)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="120"
                    value={currentSchedule.schedule.lunchDuration}
                    onChange={(e) => updateScheduleField('schedule.lunchDuration', parseInt(e.target.value) || 60)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tiempo máximo permitido para el período de comida
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tolerance */}
          <div className="bg-white rounded-lg p-6 border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tolerancia de Puntualidad</h3>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minutos de tolerancia para entrada
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={currentSchedule.toleranceMinutes}
                onChange={(e) => updateScheduleField('toleranceMinutes', parseInt(e.target.value) || 0)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minutos después de la hora de entrada que aún se considera puntual
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-medium text-blue-900 mb-4">Vista Previa del Horario</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Horarios</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>🕐 <strong>Entrada:</strong> {currentSchedule.schedule.entryTime}</li>
                  <li>🍽️ <strong>Comida:</strong> {currentSchedule.schedule.lunchStartTime}</li>
                  <li>🔄 <strong>Regreso:</strong> {
                    (() => {
                      const [hours, minutes] = currentSchedule.schedule.lunchStartTime.split(':').map(Number);
                      const returnTime = new Date();
                      returnTime.setHours(hours, minutes + currentSchedule.schedule.lunchDuration);
                      return `${returnTime.getHours().toString().padStart(2, '0')}:${returnTime.getMinutes().toString().padStart(2, '0')}`;
                    })()
                  }</li>
                  <li>🕕 <strong>Salida:</strong> {currentSchedule.schedule.exitTime}</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Configuración</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>📅 <strong>Días laborales:</strong> {currentSchedule.workDays.length} días</li>
                  <li>🎉 <strong>Feriados:</strong> {currentSchedule.worksOnHolidays ? 'Sí trabaja' : 'No trabaja'}</li>
                  <li>⏰ <strong>Tolerancia:</strong> {currentSchedule.toleranceMinutes} minutos</li>
                  <li>🍽️ <strong>Tiempo de comida:</strong> {currentSchedule.schedule.lunchDuration} minutos</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">Días de la Semana</h4>
              <div className="flex flex-wrap gap-1">
                {daysOfWeek.map(day => (
                  <span
                    key={day.value}
                    className={`px-2 py-1 text-xs rounded ${
                      currentSchedule.workDays.includes(day.value)
                        ? 'bg-blue-200 text-blue-800'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {day.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-gray-50 rounded-lg p-6 border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Guías de Configuración</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Horarios Recomendados por Producto</h4>
                <ul className="space-y-1">
                  <li><strong>Bodega Aurrera:</strong> 07:00-19:00 (todos los días)</li>
                  <li><strong>Aviva Contigo:</strong> 08:00-18:00 (lun-sáb)</li>
                  <li><strong>Aviva Tu Negocio:</strong> 08:00-18:00 (lun-sáb)</li>
                  <li><strong>Casa Marchand:</strong> 09:00-18:00 (lun-vie)</li>
                  <li><strong>Construrama:</strong> 08:00-17:00 (lun-sáb)</li>
                  <li><strong>Disensa:</strong> 08:00-18:00 (lun-sáb)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Consideraciones Importantes</h4>
                <ul className="space-y-1">
                  <li>• La tolerancia no debe exceder 30 minutos</li>
                  <li>• El tiempo de comida debe ser entre 30-120 minutos</li>
                  <li>• Los horarios deben ser realistas y operables</li>
                  <li>• Considera las regulaciones laborales locales</li>
                  <li>• Los cambios afectan inmediatamente las validaciones</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-12 text-center border">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Selecciona un Producto
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Elige un tipo de producto de las tarjetas superiores para configurar sus horarios.
          </p>
        </div>
      )}
    </div>
  );
}