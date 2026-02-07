import React, { useState } from 'react';
import { useForm } from '../../hooks';
import { useGeolocation } from '../../hooks';
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
  console.log('CheckInForm renderizado con', kiosks.length, 'kioscos');

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

  // Get unique product types from available kiosks
  const availableProductTypes = [...new Set(kiosks.map(k => k.productType))];
  const productTypeOptions = availableProductTypes.map(type => ({
    value: type,
    label: PRODUCT_TYPES[type]
  }));

  const checkInTypeOptions = Object.entries(CHECK_IN_TYPES).map(([key, label]) => ({
    value: key,
    label
  }));

  // Filter kiosks based on product type selection
  // Aviva Tu Negocio shares the same physical kiosks as Aviva Contigo
  const [selectedProductType, setSelectedProductType] = useState('');
  const filteredKiosks = selectedProductType
    ? kiosks.filter(k => k.productType === selectedProductType ||
        (selectedProductType === 'Aviva_Tu_Negocio' && k.productType === 'Aviva_Contigo'))
    : [];

  const kioskOptions = filteredKiosks.map(kiosk => ({
    value: kiosk.id,
    label: `${kiosk.name} (${kiosk.id})`,
    disabled: kiosk.status !== 'active'
  }));

  const handleProductTypeChange = (productType: string) => {
    console.log('Producto seleccionado:', productType);
    setSelectedProductType(productType);
    setValue('kioskId', '');
    setSelectedKiosk(null);
  };

  const handleKioskChange = (kioskId: string) => {
    console.log('Kiosco seleccionado:', kioskId);
    setValue('kioskId', kioskId);
    const kiosk = kiosks.find(k => k.id === kioskId);
    setSelectedKiosk(kiosk || null);
  };

  const handlePhotoCapture = async (capture: CameraCaptureType) => {
    console.log('Foto capturada:', capture.file.name, capture.file.size);
    setCapturedPhoto(capture);
    setShowCamera(false);
  };

  const handleRemovePhoto = () => {
    console.log('Foto removida');
    setCapturedPhoto(null);
  };

  const handleOpenCamera = () => {
    console.log('Abriendo cámara...');
    setShowCamera(true);
  };

  const handleFormSubmit = handleSubmit(async (formData) => {
    try {
      console.log('Enviando formulario:', formData);
      
      if (!capturedPhoto) {
        alert('La fotografía es obligatoria para registrar el check-in');
        return;
      }

      const location = await getCurrentLocation();
      console.log('Ubicación obtenida:', location);
      
      await onSubmit(
        formData,
        {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        },
        capturedPhoto.file
      );

      // Reset form on success
      reset();
      setCapturedPhoto(null);
      setSelectedKiosk(null);
      setSelectedProductType('');
    } catch (error: any) {
      console.error('Error en formulario:', error);
    }
  });

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Debug info */}
      {import.meta.env.DEV && (
        <div className="p-3 bg-gray-100 rounded text-xs">
          <strong>Debug:</strong><br/>
          Kioscos: {kiosks.length}<br/>
          Producto: {selectedProductType}<br/>
          Kiosko: {values.kioskId}<br/>
          Tipo: {values.type}<br/>
          Foto: {capturedPhoto ? 'Sí' : 'No'}<br/>
          Ubicación: {permission.granted ? 'Permitida' : 'Denegada'}
        </div>
      )}

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

      {/* Product Type Selection */}
      <Select
        label="Producto *"
        value={selectedProductType}
        onChange={(e) => handleProductTypeChange(e.target.value)}
        options={productTypeOptions}
        placeholder="Selecciona un producto"
        required
      />

      {/* Kiosk Selection */}
      <Select
        label="Kiosco *"
        value={values.kioskId}
        onChange={(e) => handleKioskChange(e.target.value)}
        options={kioskOptions}
        placeholder={selectedProductType ? "Selecciona un kiosco" : "Primero selecciona un producto"}
        error={errors.kioskId}
        disabled={!selectedProductType}
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
        label="Tipo de Check-in *"
        value={values.type}
        onChange={(e) => setValue('type', e.target.value as any)}
        options={checkInTypeOptions}
        error={errors.type}
        required
      />

      {/* Photo Capture - Simplificado */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Fotografía de Evidencia *
        </label>
        
        {!capturedPhoto ? (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="space-y-2">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="text-sm text-gray-600">
                  <p>Captura una foto como evidencia</p>
                  <p className="text-xs text-gray-500 mt-1">La fotografía es obligatoria</p>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={handleOpenCamera}
              fullWidth
            >
              📷 Tomar Foto
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <img
                src={capturedPhoto.dataUrl}
                alt="Foto capturada"
                className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-300 mx-auto"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleOpenCamera}
              >
                🔄 Tomar Nueva Foto
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Input
          label="Comentarios"
          value={values.notes || ''}
          onChange={(e) => setValue('notes', e.target.value)}
          placeholder="Añade cualquier comentario relevante aquí... (mínimo 10 caracteres si hay retraso)"
          error={errors.notes}
        />
        <p className="text-xs text-gray-500">
          Si llegas tarde, sales temprano o excedes tu tiempo de comida, se requiere un comentario de al menos 10 caracteres explicando el motivo.
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          loading={loading}
          disabled={disabled || !permission.granted || !capturedPhoto || !values.kioskId || !values.type}
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