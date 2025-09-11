import React, { useState } from 'react';
import { useForm } from '../../hooks';
import { useGeolocation, useCamera } from '../../hooks';
import { Button, Select, Input, Alert } from '../ui';
import { CameraCapture } from '../common/CameraCapture';
import { LocationPermissions } from '../common/LocationPermissions';
import { checkInSchema } from '../../utils/validators';
import { CHECK_IN_TYPES, PRODUCT_TYPES } from '../../utils/constants';
import { CheckInFormData, Kiosk, CameraCapture as CameraCaptureType } from '../../types';

interface CheckInFormProps {
  kiosks: Kiosk[];
  onSubmit: (
    data: CheckInFormData,
    location: { latitude: number; longitude: number; accuracy?: number },
    photo?: File
  ) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

export function CheckInForm({ kiosks, onSubmit, loading = false, disabled = false }: CheckInFormProps) {
  const [selectedKiosk, setSelectedKiosk] = useState<Kiosk | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<CameraCaptureType | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
  const { getCurrentLocation, permission, error: locationError } = useGeolocation();

  const {
    values,
    errors,
    handleSubmit,
    setValue,
    reset
  } = useForm<CheckInFormData>(
    { kioskId: '', type: 'entrada', notes: '' },
    (values) => {
      try {
        checkInSchema.parse(values);
        return {};
      } catch (error: any) {
        const fieldErrors: Partial<Record<keyof CheckInFormData, string>> = {};
        error.errors?.forEach((err: any) => {
          if (err.path?.length > 0) {
            fieldErrors[err.path[0] as keyof CheckInFormData] = err.message;
          }
        });
        return fieldErrors;
      }
    }
  );

  const kioskOptions = kiosks.map(kiosk => ({
    value: kiosk.id,
    label: `${kiosk.name} - ${PRODUCT_TYPES[kiosk.productType]}`,
    disabled: kiosk.status !== 'active'
  }));

  const checkInTypeOptions = Object.entries(CHECK_IN_TYPES).map(([key, label]) => ({
    value: key,
    label
  }));

  const handleKioskChange = (kioskId: string) => {
    setValue('kioskId', kioskId);
    const kiosk = kiosks.find(k => k.id === kioskId);
    setSelectedKiosk(kiosk || null);
  };

  const handlePhotoCapture = (capture: CameraCaptureType) => {
    setCapturedPhoto(capture);
    setShowCamera(false);
  };

  const handleRemovePhoto = () => {
    setCapturedPhoto(null);
  };

  const handleFormSubmit = handleSubmit(async (formData) => {
    try {
      // Get current location
      const location = await getCurrentLocation();
      
      // Submit with photo if captured
      await onSubmit(
        formData,
        {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        },
        capturedPhoto?.file
      );

      // Reset form on success
      reset();
      setCapturedPhoto(null);
      setSelectedKiosk(null);
    } catch (error: any) {
      console.error('Form submission error:', error);
    }
  });

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Location Permissions Check */}
      {!permission.granted && (
        <LocationPermissions />
      )}

      {/* Location Error */}
      {locationError && (
        <Alert
          type="error"
          title="Error de Ubicación"
          message={locationError}
        />
      )}

      {/* Kiosk Selection */}
      <Select
        label="Kiosco"
        value={values.kioskId}
        onChange={(e) => handleKioskChange(e.target.value)}
        options={kioskOptions}
        placeholder="Selecciona un kiosco"
        error={errors.kioskId}
        required
      />

      {/* Selected Kiosk Info */}
      {selectedKiosk && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Información del Kiosco
          </h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Nombre:</strong> {selectedKiosk.name}</p>
            <p><strong>Ubicación:</strong> {selectedKiosk.city}, {selectedKiosk.state}</p>
            <p><strong>Producto:</strong> {PRODUCT_TYPES[selectedKiosk.productType]}</p>
          </div>
        </div>
      )}

      {/* Check-in Type */}
      <Select
        label="Tipo de Check-in"
        value={values.type}
        onChange={(e) => setValue('type', e.target.value as any)}
        options={checkInTypeOptions}
        error={errors.type}
        required
      />

      {/* Photo Capture */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Fotografía de Evidencia
        </label>
        
        {!capturedPhoto ? (
          <div className="space-y-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCamera(true)}
              leftIcon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            >
              Capturar Foto
            </Button>
            <p className="text-xs text-gray-500">
              La fotografía es opcional pero recomendada como evidencia del registro.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <img
                src={capturedPhoto.dataUrl}
                alt="Foto capturada"
                className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-300"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowCamera(true)}
            >
              Tomar Nueva Foto
            </Button>
          </div>
        )}
      </div>

      {/* Notes */}
      <Input
        label="Notas (Opcional)"
        value={values.notes || ''}
        onChange={(e) => setValue('notes', e.target.value)}
        placeholder="Añade cualquier comentario relevante aquí..."
        error={errors.notes}
      />

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          loading={loading}
          disabled={disabled || !permission.granted}
          leftIcon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          Registrar Check-in
        </Button>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handlePhotoCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </form>
  );
}