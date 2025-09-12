// src/components/admin/ScheduleConfig.tsx - NUEVO ARCHIVO COMPLETO
import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Alert } from '../ui';
import { ScheduleService } from '../../services/schedules';
import { PRODUCT_TYPES } from '../../utils/constants';
import { ProductSchedule, ProductType } from '../../types';
import { ClockIcon } from '@heroicons/react/24/outline';

export function ScheduleConfig() {
  const [selectedProduct, setSelectedProduct] = useState<ProductType>('BA');
  const [schedule, setSchedule] = useState<ProductSchedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchedule();
  }, [selectedProduct]);

  const loadSchedule = async () => {
    try {
      const productSchedule = await ScheduleService.getProductSchedule(selectedProduct);
      setSchedule(productSchedule);
    } catch (error) {
      console.error('Error loading schedule:', error);
      setError('Error cargando horario');
    }
  };

  const handleSave = async () => {
    if (!schedule) return;
    
    try {
      setSaving(true);
      setError(null);
      await ScheduleService.saveProductSchedule(schedule);
      setSuccess('Horario guardado correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving schedule:', error);
      setError('Error guardando horario');
    } finally {
      setSaving(false);
    }
  };

  const updateScheduleField = (field: string, value: any) => {
    if (!schedule) return;
    
    const keys = field.split('.');
    const newSchedule = { ...schedule };
    
    if (keys.length === 2) {
      (newSchedule as any)[keys[0]][keys[1]] = value;
    } else {
      (newSchedule as any)[field] = value;
    }
    
    setSchedule(newSchedule);
  };

  const toggleWorkDay = (day: number) => {
    if (!schedule) return;
    
    const workDays = [...schedule.workDays];
    const index = workDays.indexOf(day);
    
    if (index > -1) {
      workDays.splice(index, 1);
    } else {
      workDays.push(day);
      workDays.sort();
    }
    
    setSchedule({ ...schedule, workDays });
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

  if (!schedule) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <Alert type="success" message={success} dismissible onDismiss={() => setSuccess(null)} />
      )}
      
      {error && (
        <Alert type="error" message={error} dismissible onDismiss={() => setError(null)} />
      )}
      
      {/* Product Selection */}
      <div className="bg-white rounded-lg p-6 border">
        <Select
          label="Configurar horarios para"
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value as ProductType)}
          options={productOptions}
        />
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
                  checked={schedule.workDays.includes(day.value)}
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
              checked={schedule.worksOnHolidays}
              onChange={(e) => updateScheduleField('worksOnHolidays', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium">Trabaja en días feriados</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Si está activado, los empleados deberán registrar asistencia incluso en días feriados
          </p>
        </div>
      </div>

      {/* Schedule Times */}
      <div className="bg-white rounded-lg p-6 border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Horarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Hora de Entrada"
            type="time"
            value={schedule.schedule.entryTime}
            onChange={(e) => updateScheduleField('schedule.entryTime', e.target.value)}
            required
          />
          
          <Input
            label="Hora de Salida"
            type="time"
            value={schedule.schedule.exitTime}
            onChange={(e) => updateScheduleField('schedule.exitTime', e.target.value)}
            required
          />
          
          <Input
            label="Hora de Comida"
            type="time"
            value={schedule.schedule.lunchStartTime}
            onChange={(e) => updateScheduleField('schedule.lunchStartTime', e.target.value)}
            required
          />
          
          <Input
            label="Duración de Comida (minutos)"
            type="number"
            value={schedule.schedule.lunchDuration}
            onChange={(e) => updateScheduleField('schedule.lunchDuration', parseInt(e.target.value) || 60)}
            min="30"
            max="120"
            helpText="Tiempo máximo permitido para comida"
            required
          />
        </div>
      </div>

      {/* Tolerance */}
      <div className="bg-white rounded-lg p-6 border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tolerancia</h3>
        <Input
          label="Minutos de tolerancia para entrada"
          type="number"
          value={schedule.toleranceMinutes}
          onChange={(e) => updateScheduleField('toleranceMinutes', parseInt(e.target.value) || 0)}
          min="0"
          max="30"
          helpText="Minutos después de la hora de entrada que aún se considera puntual"
        />
      </div>

      {/* Current Configuration Summary */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-medium text-blue-900 mb-4">Resumen de Configuración</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Horario de trabajo:</span>
            <p className="font-medium text-blue-900">
              {schedule.schedule.entryTime} - {schedule.schedule.exitTime}
            </p>
          </div>
          <div>
            <span className="text-blue-700">Horario de comida:</span>
            <p className="font-medium text-blue-900">
              {schedule.schedule.lunchStartTime} ({schedule.schedule.lunchDuration} min)
            </p>
          </div>
          <div>
            <span className="text-blue-700">Días laborales:</span>
            <p className="font-medium text-blue-900">
              {schedule.workDays.map(d => daysOfWeek.find(day => day.value === d)?.label).join(', ')}
            </p>
          </div>
          <div>
            <span className="text-blue-700">Trabaja en feriados:</span>
            <p className="font-medium text-blue-900">
              {schedule.worksOnHolidays ? 'Sí' : 'No'}
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          loading={saving}
          leftIcon={<ClockIcon className="h-4 w-4" />}
        >
          Guardar Horario
        </Button>
      </div>
    </div>
  );
}