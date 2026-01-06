// src/pages/employee/SimpleCheckIn.tsx - CON SISTEMA DE TOAST COMPLETO
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreService } from '../../services/firestore';
import { StorageService } from '../../services/storage';
import { useGeolocation } from '../../hooks';
import { Button, Input, Select, Alert } from '../../components/ui';
import { Toast, useToast } from '../../components/ui/Toast'; // ✅ TOAST SYSTEM
import { MapPinIcon, CameraIcon, ClockIcon, CalendarDaysIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PRODUCT_TYPES, CHECK_IN_TYPES, TIME_OFF_TYPES } from '../../utils/constants';
import { CheckInFormData, TimeOffFormData, Kiosk } from '../../types';

export default function SimpleCheckIn() {
  const { user } = useAuth();
  const { location, getCurrentLocation, permission } = useGeolocation();
  const { toast, showSuccess, showError, hideToast } = useToast(); // ✅ TOAST HOOKS
  
  // States for Check-in
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [selectedKiosk, setSelectedKiosk] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [checkInType, setCheckInType] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ❌ REMOVIDO: success state - ahora usamos Toast

  // States for Time Off Request
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [timeOffType, setTimeOffType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submittingTimeOff, setSubmittingTimeOff] = useState(false);
  
  // Camera states - CORREGIDOS CON PREVIEW
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [takingPhoto, setTakingPhoto] = useState(false);
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

  // Cleanup effect for camera
  useEffect(() => {
    return () => {
      console.log('Limpiando recursos de cámara...');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Track detenido:', track.kind);
        });
        streamRef.current = null;
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

  // Camera functions - CORREGIDAS CON PREVIEW
  const startCameraPreview = async () => {
    try {
      setCameraError(null);
      setCameraReady(false);
      setShowCameraPreview(true);
      
      // Detener cualquier stream anterior
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      console.log('Iniciando preview de cámara con facingMode:', facingMode);
      
      const constraints = {
        video: { 
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Esperar a que el video esté listo
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                setCameraReady(true);
                console.log('Preview de cámara iniciado correctamente');
              })
              .catch((playError) => {
                console.error('Error reproduciendo video:', playError);
                setCameraError('Error iniciando el preview de la cámara');
              });
          }
        };
        
        // Manejar errores del video
        videoRef.current.onerror = () => {
          setCameraError('Error en el stream de video');
        };
      }
      
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Error accediendo a la cámara';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permisos de cámara denegados. Por favor permite el acceso a la cámara.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No se encontró ninguna cámara en el dispositivo.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'La cámara está siendo usada por otra aplicación.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'La configuración de cámara solicitada no está disponible.';
      }
      
      setCameraError(errorMessage);
      setError(errorMessage);
      setShowCameraPreview(false);
    }
  };

  const stopCameraPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track detenido:', track.kind);
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setShowCameraPreview(false);
    setCameraReady(false);
    setCameraError(null);
  };

  const capturePhotoFromPreview = async () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) {
      setError('La cámara no está lista. Inténtalo de nuevo.');
      return;
    }

    try {
      setTakingPhoto(true);
      
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Verificar que el video tenga dimensiones válidas
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setError('El video no está listo. Espera un momento y vuelve a intentar.');
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('Error obteniendo contexto del canvas');
        return;
      }
      
      // Limpiar el canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Si es cámara frontal, voltear horizontalmente
      if (facingMode === 'user') {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      if (facingMode === 'user') {
        ctx.restore();
      }
      
      // Convertir a blob con buena calidad
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, {
            type: 'image/jpeg'
          });
          const url = canvas.toDataURL('image/jpeg', 0.8);

          setPhoto(url);
          setPhotoFile(file);
          stopCameraPreview(); // Detener preview después de capturar
          setError(null);
          setCameraError(null);

          console.log('Foto capturada exitosamente:', {
            size: file.size,
            type: file.type,
            name: file.name,
            dimensions: `${canvas.width}x${canvas.height}`
          });
        } else {
          setError('Error generando la imagen');
        }
      }, 'image/jpeg', 0.8);
      
    } catch (error: any) {
      console.error('Error capturing photo:', error);
      setError('Error capturando la foto: ' + error.message);
    } finally {
      setTakingPhoto(false);
    }
  };

  const switchCamera = async () => {
    try {
      stopCameraPreview();
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
      
      // Esperar un poco antes de iniciar la nueva cámara
      setTimeout(() => {
        startCameraPreview();
      }, 500);
    } catch (error) {
      console.error('Error switching camera:', error);
      setError('Error cambiando de cámara');
    }
  };

  const removePhoto = () => {
    if (photo) {
      setPhoto(null);
      setPhotoFile(null);
      setCameraError(null);
      setError(null);
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
      setError('La fotografía es obligatoria. Por favor toma una foto.');
      return false;
    }
    if (!location) {
      setError('No se pudo obtener la ubicación. Por favor activa el GPS');
      return false;
    }
    setError(null);
    return true;
  };

  // ✅ ACTUALIZADO: Handle check-in submission CON TOAST
  const handleCheckIn = async () => {
    if (!user) return;
    
    if (!validateCheckIn()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Generate check-in ID first
      const checkInId = FirestoreService.generateCheckInId();

      // Upload photo with the generated ID
      const photoUrl = await StorageService.uploadCheckInPhoto(
        user.id,
        photoFile!,
        checkInId
      );

      // Create check-in with the photo URL
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
        photoUrl,
        checkInId
      );

      // ✅ USAR TOAST EN LUGAR DE setState
      showSuccess(
        'Check-in registrado exitosamente',
        `Tu ${CHECK_IN_TYPES[checkInType as keyof typeof CHECK_IN_TYPES]} ha sido registrado correctamente.`
      );
      
      // Reset form
      setSelectedKiosk('');
      setSelectedProduct('');
      setCheckInType('');
      setNotes('');
      removePhoto();
      
    } catch (error: any) {
      console.error('Error submitting check-in:', error);
      showError('Error registrando check-in', error.message || 'Ha ocurrido un error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ ACTUALIZADO: Handle time off request CON TOAST
  const handleTimeOffRequest = async () => {
    if (!user) return;
    
    if (!timeOffType || !startDate || !endDate) {
      showError('Campos requeridos', 'Por favor completa todos los campos requeridos');
      return;
    }

    if (timeOffType === 'incapacidad' && !reason.trim()) {
      showError('Motivo requerido', 'El motivo es obligatorio para incapacidades');
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

      // ✅ USAR TOAST EN LUGAR DE alert()
      showSuccess(
        'Solicitud enviada exitosamente',
        'Tu solicitud de días libres ha sido enviada y está pendiente de aprobación.'
      );
      
      // Reset form
      setTimeOffType('');
      setStartDate('');
      setEndDate('');
      setReason('');
      setShowTimeOffModal(false);
    } catch (error) {
      console.error('Error submitting time off request:', error);
      showError('Error enviando solicitud', 'Ha ocurrido un error al enviar tu solicitud');
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
    if (location) return 'Ubicación obtenida';
    if (!permission.granted) return 'Permisos de ubicación requeridos';
    return 'Obteniendo ubicación...';
  };

  // ✅ ACTUALIZADO: Request location permission CON TOAST
  const requestLocationPermission = async () => {
    try {
      await getCurrentLocation();
    } catch (error) {
      showError('Error de permisos', 'Por favor permite el acceso a la ubicación en la configuración del navegador');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ✅ COMPONENTE TOAST */}
      <Toast
        isOpen={toast.isOpen}
        onClose={hideToast}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        position="top-center"
        duration={6000}
      />

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
        
        {/* ❌ REMOVIDO: Success Message - ahora usa Toast */}
        
        {/* Error Message - mantener para errores de validación */}
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

          {/* Photo Section - OBLIGATORIA CON PREVIEW */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fotografía de Evidencia <span className="text-red-500">*</span>
            </label>
            
            {/* Mostrar errores de cámara */}
            {cameraError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{cameraError}</p>
                <div className="mt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCameraError(null);
                      startCameraPreview();
                    }}
                    className="text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Reintentar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraError(null);
                      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
                      setTimeout(startCameraPreview, 100);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Probar otra cámara
                  </button>
                </div>
              </div>
            )}
            
            {!showCameraPreview && !photo ? (
              // Botón inicial para abrir cámara
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={startCameraPreview}
                  className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-500 flex flex-col items-center justify-center space-y-2"
                >
                  <CameraIcon className="h-8 w-8" />
                  <span className="font-medium">Abrir Cámara</span>
                  <span className="text-xs text-gray-400">
                    Toca para ver el preview y tomar foto
                  </span>
                </button>
                
                {/* Selector de cámara */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                    className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center space-x-1"
                  >
                    <span>Cambiar</span>
                    <span>Usar cámara {facingMode === 'environment' ? 'frontal' : 'trasera'}</span>
                  </button>
                </div>
                
                {/* Instrucciones */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800 text-sm font-medium mb-1">Instrucciones:</p>
                  <ul className="text-blue-700 text-xs space-y-1">
                    <li>• Asegúrate de estar en el kiosco correcto</li>
                    <li>• Podrás ver el preview antes de tomar la foto</li>
                    <li>• Mantén el teléfono estable al capturar</li>
                    <li>• Es obligatorio tomar una foto para cada check-in</li>
                  </ul>
                </div>
              </div>
            ) : showCameraPreview ? (
              // Preview de cámara activo
              <div className="space-y-3">
                {/* Contenedor del video */}
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                    style={{ 
                      transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                    }}
                  />
                  
                  {/* Overlay de carga */}
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p className="text-sm">Iniciando cámara...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Botón para cambiar cámara */}
                  {cameraReady && (
                    <button
                      type="button"
                      onClick={switchCamera}
                      className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70"
                      title="Cambiar cámara"
                    >
                      Cambiar
                    </button>
                  )}
                  
                  {/* Indicador de cámara activa */}
                  {cameraReady && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                      LIVE
                    </div>
                  )}
                </div>
                
                {/* Botones de control */}
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={stopCameraPreview}
                    className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={capturePhotoFromPreview}
                    disabled={!cameraReady || takingPhoto}
                    className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {takingPhoto ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                        Capturando...
                      </>
                    ) : (
                      <>Tomar Foto</>
                    )}
                  </button>
                </div>
                
                {/* Instrucciones durante preview */}
                {cameraReady && (
                  <p className="text-xs text-gray-500 text-center">
                    Posiciónate correctamente y presiona "Tomar Foto"
                  </p>
                )}
              </div>
            ) : (
              // Mostrar foto capturada
              <div className="space-y-3">
                <div className="relative">
                  <img 
                    src={photo} 
                    alt="Foto de evidencia capturada" 
                    className="w-full h-48 object-cover rounded-lg border-2 border-green-200"
                    onError={() => {
                      setError('Error mostrando la imagen capturada');
                      removePhoto();
                    }}
                  />
                  
                  {/* Indicador de éxito */}
                  <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  
                  {/* Botón para eliminar */}
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    title="Eliminar foto"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Opciones para la foto capturada */}
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      removePhoto();
                      startCameraPreview();
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Tomar Nueva
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removePhoto();
                      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
                      setTimeout(startCameraPreview, 100);
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Cambiar Cámara
                  </button>
                </div>
                
                {/* Confirmación */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-green-800 text-sm font-medium">Foto lista para enviar</p>
                  <p className="text-green-600 text-xs">La fotografía se adjuntará a tu check-in</p>
                </div>
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

      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

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
    </div>
  );
}