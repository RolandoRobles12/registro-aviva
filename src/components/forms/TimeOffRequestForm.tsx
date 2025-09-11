import React from 'react';
import { useForm } from '../../hooks';
import { Button, Select, Input, Alert } from '../ui';
import { timeOffRequestSchema } from '../../utils/validators';
import { TIME_OFF_TYPES } from '../../utils/constants';
import { TimeOffFormData } from '../../types';

interface TimeOffRequestFormProps {
  onSubmit: (data: TimeOffFormData) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

export function TimeOffRequestForm({ onSubmit, loading = false, disabled = false }: TimeOffRequestFormProps) {
  const {
    values,
    errors,
    handleSubmit,
    setValue,
    reset
  } = useForm<TimeOffFormData>(
    {
      type: 'vacaciones',
      startDate: new Date(),
      endDate: new Date(),
      reason: ''
    },
    (values) => {
      try {
        timeOffRequestSchema.parse(values);
        return {};
      } catch (error: any) {
        const fieldErrors: Partial<Record<keyof TimeOffFormData, string>> = {};
        error.errors?.forEach((err: any) => {
          if (err.path?.length > 0) {
            fieldErrors[err.path[0] as keyof TimeOffFormData] = err.message;
          }
        });
        return fieldErrors;
      }
    }
  );

  const timeOffTypeOptions = Object.entries(TIME_OFF_TYPES).map(([key, label]) => ({
    value: key,
    label
  }));

  const handleFormSubmit = handleSubmit(async (formData) => {
    await onSubmit(formData);
    reset();
  });

  const handleTypeChange = (type: string) => {
    setValue('type', type as any);
    
    // For Aviva Day, set end date to same as start date
    if (type === 'aviva_day') {
      setValue('endDate', values.startDate);
    }
  };

  const handleStartDateChange = (date: string) => {
    const newDate = new Date(date);
    setValue('startDate', newDate);
    
    // For Aviva Day, always keep end date same as start date
    if (values.type === 'aviva_day') {
      setValue('endDate', newDate);
    }
    
    // If end date is before start date, update it
    if (values.endDate < newDate) {
      setValue('endDate', newDate);
    }
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Type Selection */}
      <Select
        label="Tipo de Solicitud"
        value={values.type}
        onChange={(e) => handleTypeChange(e.target.value)}
        options={timeOffTypeOptions}
        error={errors.type}
        required
      />

      {/* Type-specific information */}
      {values.type === 'aviva_day' && (
        <Alert
          type="info"
          message="Aviva Day solo puede ser por un día. Puedes usarlo para descanso personal o asuntos familiares."
        />
      )}

      {values.type === 'incapacidad' && (
        <Alert
          type="warning"
          message="Para incapacidades, es obligatorio especificar el motivo. Considera adjuntar documentos médicos."
        />
      )}

      {/* Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Fecha de Inicio"
          type="date"
          value={formatDateForInput(values.startDate)}
          onChange={(e) => handleStartDateChange(e.target.value)}
          min={formatDateForInput(new Date())}
          error={errors.startDate}
          required
        />

        <Input
          label="Fecha de Fin"
          type="date"
          value={formatDateForInput(values.endDate)}
          onChange={(e) => setValue('endDate', new Date(e.target.value))}
          min={formatDateForInput(values.startDate)}
          disabled={values.type === 'aviva_day'}
          error={errors.endDate}
          required
        />
      </div>

      {/* Duration Display */}
      {values.startDate && values.endDate && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-700">
            <strong>Duración:</strong>{' '}
            {values.type === 'aviva_day' 
              ? '1 día'
              : `${Math.ceil((values.endDate.getTime() - values.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} días`
            }
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Desde {values.startDate.toLocaleDateString()} hasta {values.endDate.toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Reason */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Motivo {values.type === 'incapacidad' && <span className="text-red-500">*</span>}
        </label>
        <textarea
          value={values.reason || ''}
          onChange={(e) => setValue('reason', e.target.value)}
          rows={4}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          placeholder={
            values.type === 'incapacidad' 
              ? 'Describe brevemente el motivo de la incapacidad...'
              : values.type === 'vacaciones'
              ? 'Opcional: Describe el motivo de tus vacaciones...'
              : 'Opcional: Describe el motivo de tu día libre...'
          }
          required={values.type === 'incapacidad'}
        />
        {errors.reason && (
          <p className="text-sm text-red-600">{errors.reason}</p>
        )}
      </div>

      {/* Guidelines */}
      <div className="bg-gray-50 rounded-md p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Políticas de Días Libres
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Vacaciones:</strong> Requieren aprobación previa del supervisor</li>
          <li>• <strong>Aviva Day:</strong> Máximo 1 por mes, sujeto a aprobación</li>
          <li>• <strong>Incapacidad:</strong> Notificar lo antes posible y adjuntar documentos</li>
          <li>• Las solicitudes se procesan en orden de recepción</li>
        </ul>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          loading={loading}
          disabled={disabled}
          leftIcon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          }
        >
          Enviar Solicitud
        </Button>
      </div>
    </form>
  );
}