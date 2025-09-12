// src/pages/employee/SimpleCheckIn.tsx - COMPLETO
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreService } from '../../services/firestore';
import { StorageService } from '../../services/storage';
import { useGeolocation } from '../../hooks';
import { Button, Input, Select, Alert } from '../../components/ui';
import { MapPinIcon, CameraIcon, ClockIcon, CalendarDaysIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PRODUCT_TYPES, CHECK_IN_TYPES, TIME_OFF_TYPES } from '../../utils/constants';
import { CheckInFormData, TimeOffFormData, Kiosk } from '../../types';

export default function SimpleCheckIn() {
  const { user } = useAuth();
  const { location, getCurrentLocation, permission } = useGeolocation();
  
  // States for Check-in
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [selectedKiosk, setSelectedKiosk] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [checkInType, setCheckInType] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCameraInline, setShowCameraInline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // States for Time Off Request
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [timeOffType, setTimeOffType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submittingTimeOff, setSubmittingTimeOff] = useState(false);
  
  // Camera states
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load kiosks on mount
  useEffect(() => {
    loadKiosks();
  }, []);

  // Request location permission on mount
  useEffect(() => {
    const requestLocationOnLoad = async () => {
      if (!location && 'geolocation' in navigator) {
        try {
          await getCurrentLocation();
        } catch (error) {
          console.log('Location permission not granted yet');
        }
      }
    };
    
    requestLocationOnLoad();
  }, [getCurrentLocation, location]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const loadKiosks = async () => {
    try {
      const kiosksList = await FirestoreService.getActiveKiosks();
      setKiosks(kiosksList);
    } catch (error) {
      console.error('Error loading kiosks:', error);
      setError('Error cargando kioscos');
    }
  };

  // Filter kiosks by selected product
  const filteredKiosks = selectedProduct 
    ? kiosks.filter(k => k.productType === selectedProduct)
    : [];

  // Camera functions - CORREGIDAS
  const startCameraInline = async () => {
    try {
      // Detener cualquier stream anterior
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        video: { 
          facingMode: { exact: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      // Intentar con facingMode exact, si falla, usar ideal
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        // Si falla con exact, intentar con ideal
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      }
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Esperar a que el video esté listo
        await videoRef.current.play();
      }
      setShowCameraInline(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Error accediendo a la cámara. Por favor permite el acceso a la cámara.');
    }
  };

  const stopCameraInline = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCameraInline(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Si es cámara frontal, voltear horizontalmente
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            setPhoto(url);
            setPhotoFile(file);
            stopCameraInline();
            setError(null);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const switchCamera = () => {
    stopCameraInline();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    setTimeout(startCameraInline, 100);
  };

  const removePhoto = () => {
    if (photo) {
      URL.revokeObjectURL(photo);
      setPhoto(null);
      setPhotoFile(null);
    }
  };

  // Validation function
  const validateCheckIn = () => {
    if (!selectedProduct) {
      setError('Por favor selecciona un producto');
      return false;
    }
    if (!selectedKiosk) {
      setError('Por favor selecciona un kiosco');
      return false;
    }
    if (!checkInType) {
      setError('Por favor selecciona el tipo de registro');
      return false;
    }
    if (!photoFile) {
      setError('La fotografía es obligatoria');
      return false;
    }
    if (!location) {
      setError('No se pudo obtener la ubicación. Por favor activa el GPS');
      return false;
    }
    setError(null);
    return true;
  };

  // Handle check-in submission
  const handleCheckIn = async () => {
    if (!user) return;
    
    if (!validateCheckIn()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // Upload photo first
      let photoUrl: string | undefined;
      if (photoFile) {
        photoUrl = await StorageService.uploadCheckInPhoto(
          user.id,
          photoFile,
          `checkin_${Date.now()}`
        );
      }

      const formData: CheckInFormData = {
        kioskId: selectedKiosk,
        type: checkInType as any,
        notes: notes || undefined
      };

      await FirestoreService.createCheckIn(
        user.id,
        formData,
        {
          latitude: location!.latitude,
          longitude: location!.longitude,
          accuracy: location!.accuracy
        },
        photoUrl
      );

      setSuccess('✓ Check-in registrado exitosamente!');
      
      // Reset form
      setSelectedKiosk('');
      setSelectedProduct('');
      setCheckInType('');
      setNotes('');
      removePhoto();
      stopCameraInline();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (error: any) {
      console.error('Error submitting check-in:', error);
      setError(error.message || 'Error registrando check-in');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle time off request
  const handleTimeOffRequest = async () => {
    if (!user) return;
    
    if (!timeOffType || !startDate || !endDate) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    if (timeOffType === 'incapacidad' && !reason.trim()) {
      alert('El motivo es obligatorio para incapacidades');
      return;
    }

    try {
      setSubmittingTimeOff(true);
      
      const formData: TimeOffFormData = {
        type: timeOffType as any,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || undefined
      };

      await FirestoreService.createTimeOffRequest(user.id, formData);

      alert('✓ Solicitud enviada exitosamente!');
      
      // Reset form
      setTimeOffType('');
      setStartDate('');
      setEndDate('');
      setReason('');
      setShowTimeOffModal(false);
    } catch (error) {
      console.error('Error submitting time off request:', error);
      alert('Error enviando solicitud');
    } finally {
      setSubmittingTimeOff(false);
    }
  };

  // Handle date changes for Aviva Day
  useEffect(() => {
    if (timeOffType === 'aviva_day' && startDate) {
      setEndDate(startDate);
    }
  }, [timeOffType, startDate]);

  const getLocationStatus = () => {
    if (location) return '✓ Ubicación obtenida';
    if (!permission.granted) return '❌ Permisos de ubicación requeridos';
    return 'Obteniendo ubicación...';
  };

  const requestLocationPermission = async () => {
    try {
      await getCurrentLocation();
    } catch (error) {
      alert('Por favor permite el acceso a la ubicación en la configuración del navegador');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-primary-600 text-white p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-6 w-6" />
            <h1 className="text-xl font-bold">Asistencia Aviva</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">{user.name}</span>
            {(user.role === 'admin' || user.role === 'super_admin') && (
              <a 
                href="/admin/dashboard"
                className="bg-primary-500 hover:bg-primary-400 px-3 py-1 rounded text-sm"
              >
                Panel Admin
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {/* Location Status */}
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPinIcon className="h-5 w-5 text-primary-600" />
              <span className="text-sm">{getLocationStatus()}</span>
            </div>
            {!permission.granted && (
              <button
                onClick={requestLocationPermission}
                className="bg-primary-600 text-white px-3 py-1 rounded text-sm hover:bg-primary-700"
              >
                Permitir
              </button>
            )}
          </div>
        </div>

        {/* Check-in Form */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-center">Registrar Check-in</h2>
          
          {/* Product Selection - OBLIGATORIO */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Producto <span className="text-red-500">*</span>
            </label>
            <select 
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                setSelectedKiosk(''); // Reset kiosk when product changes
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Selecciona un producto</option>
              {Object.entries(PRODUCT_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Kiosk Selection - OBLIGATORIO */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kiosco <span className="text-red-500">*</span>
            </label>
            <select 
              value={selectedKiosk}
              onChange={(e) => setSelectedKiosk(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={!selectedProduct}
              required
            >
              <option value="">
                {selectedProduct ? "Selecciona un kiosco" : "Primero selecciona un producto"}
              </option>
              {filteredKiosks.map(kiosk => (
                <option key={kiosk.id} value={kiosk.id}>
                  {kiosk.name} - {kiosk.city} ({kiosk.id})
                </option>
              ))}
            </select>
          </div>

          {/* Check-in Type - OBLIGATORIO */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Registro <span className="text-red-500">*</span>
            </label>
            <select 
              value={checkInType}
              onChange={(e) => setCheckInType(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Selecciona el tipo</option>
              {Object.entries(CHECK_IN_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Photo Section - OBLIGATORIA */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fotografía <span className="text-red-500">*</span>
            </label>
            
            {!showCameraInline && !photo ? (
              <button
                type="button"
                onClick={startCameraInline}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-500 flex items-center justify-center space-x-2"
              >
                <CameraIcon className="h-6 w-6" />
                <span>Tomar Foto (Obligatorio)</span>
              </button>
            ) : showCameraInline ? (
              <div className="space-y-3">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover rounded-lg bg-black"
                    style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                  />
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70"
                  >
                    🔄
                  </button>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={stopCameraInline}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700"
                  >
                    📸 Capturar
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <img 
                  src={photo} 
                  alt="Captured" 
                  className="w-full h-48 object-cover rounded-lg"
                  style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removePhoto();
                    startCameraInline();
                  }}
                  className="absolute bottom-2 right-2 bg-primary-500 text-white px-3 py-1 rounded text-sm hover:bg-primary-600"
                >
                  Tomar Nueva
                </button>
              </div>
            )}
          </div>

          {/* Notes - OPCIONAL */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas <span className="text-gray-400">(Opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade cualquier comentario relevante..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
            />
          </div>

          <p className="text-xs text-gray-500 mb-4 text-center">
            Todos los campos con * son obligatorios
          </p>

          {/* Check-in Button */}
          <button
            onClick={handleCheckIn}
            disabled={submitting || !location || !photoFile || !selectedProduct || !selectedKiosk || !checkInType}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Registrando...' : 'Registrar Check-in'}
          </button>
        </div>

        {/* Time Off Request Button */}
        <button
          onClick={() => setShowTimeOffModal(true)}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
        >
          <CalendarDaysIcon className="h-5 w-5" />
          <span>Solicitar Días Libres</span>
        </button>
      </div>

      {/* Time Off Request Modal */}
      {showTimeOffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Solicitar Días Libres</h2>
              <button
                onClick={() => setShowTimeOffModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Solicitud <span className="text-red-500">*</span>
              </label>
              <select 
                value={timeOffType}
                onChange={(e) => setTimeOffType(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Selecciona el tipo</option>
                {Object.entries(TIME_OFF_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Fin <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || new Date().toISOString().split('T')[0]}
                disabled={timeOffType === 'aviva_day'}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
              />
              {timeOffType === 'aviva_day' && (
                <p className="text-xs text-gray-500 mt-1">Aviva Day solo puede ser por un día</p>
              )}
            </div>

            {/* Reason */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo {timeOffType === 'incapacidad' && <span className="text-red-500">*</span>}
                {(timeOffType === 'vacaciones' || timeOffType === 'aviva_day') && <span className="text-gray-400">(Opcional)</span>}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  timeOffType === 'incapacidad' 
                    ? 'Describe el motivo de la incapacidad...'
                    : 'Motivo opcional...'
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                rows={3}
                required={timeOffType === 'incapacidad'}
              />
            </div>

            <p className="text-xs text-gray-500 mb-4 text-center">
              Las solicitudes requieren aprobación del supervisor
            </p>

            {/* Buttons */}
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowTimeOffModal(false);
                  setTimeOffType('');
                  setStartDate('');
                  setEndDate('');
                  setReason('');
                }}
                disabled={submittingTimeOff}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleTimeOffRequest}
                disabled={submittingTimeOff || !timeOffType || !startDate || !endDate || (timeOffType === 'incapacidad' && !reason)}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingTimeOff ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}