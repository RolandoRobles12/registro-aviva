// src/hooks/index.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { LocationData, LocationPermission, CameraCapture } from '../types';

// =================== GEOLOCATION HOOK ===================

export function useGeolocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [permission, setPermission] = useState<LocationPermission>({ granted: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = 'Geolocalización no soportada por este navegador';
        setError(error);
        reject(new Error(error));
        return;
      }

      setLoading(true);
      setError(null);

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000 // 1 minute
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          
          setLocation(locationData);
          setPermission({ granted: true });
          setLoading(false);
          resolve(locationData);
        },
        (error) => {
          let errorMessage = 'Error obteniendo ubicación';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permisos de ubicación denegados';
              setPermission({ granted: false, error: errorMessage });
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Ubicación no disponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tiempo de espera agotado para obtener ubicación';
              break;
          }
          
          setError(errorMessage);
          setLoading(false);
          reject(new Error(errorMessage));
        },
        options
      );
    });
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      
      if (result.state === 'granted') {
        setPermission({ granted: true });
        return true;
      } else if (result.state === 'prompt') {
        // Try to get location, which will prompt for permission
        await getCurrentLocation();
        return true;
      } else {
        setPermission({ granted: false, error: 'Permisos de ubicación denegados' });
        return false;
      }
    } catch (error) {
      setPermission({ granted: false, error: 'Error solicitando permisos' });
      return false;
    }
  }, [getCurrentLocation]);

  return {
    location,
    permission,
    loading,
    error,
    getCurrentLocation,
    requestPermission
  };
}

// =================== CAMERA HOOK ===================

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const openCamera = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsOpen(true);
      setIsLoading(false);
      return true;
    } catch (error: any) {
      let errorMessage = 'Error accediendo a la cámara';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permisos de cámara denegados';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No se encontró cámara';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Cámara en uso por otra aplicación';
      }

      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, [facingMode]);

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsOpen(false);
    setError(null);
  }, []);

  const capturePhoto = useCallback(async (quality = 0.8): Promise<CameraCapture | null> => {
    if (!videoRef.current || !canvasRef.current || !isOpen) {
      throw new Error('Cámara no disponible');
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('No se pudo obtener contexto del canvas');
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Error capturando foto'));
            return;
          }

          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          const dataUrl = canvas.toDataURL('image/jpeg', quality);

          resolve({
            file,
            blob,
            dataUrl
          });
        },
        'image/jpeg',
        quality
      );
    });
  }, [isOpen]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (isOpen) {
      closeCamera();
      setTimeout(() => openCamera(), 100);
    }
  }, [isOpen, openCamera, closeCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeCamera();
    };
  }, [closeCamera]);

  return {
    videoRef,
    canvasRef,
    isOpen,
    isLoading,
    error,
    facingMode,
    openCamera,
    closeCamera,
    capturePhoto,
    switchCamera
  };
}

// =================== LOCAL STORAGE HOOK ===================

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}

// =================== DEBOUNCE HOOK ===================

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// =================== ASYNC STATE HOOK ===================

export function useAsyncState<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (asyncFunction: () => Promise<T>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFunction();
      setData(result);
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Ha ocurrido un error';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset
  };
}

// =================== FORM HOOK ===================

export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validator?: (values: T) => Partial<Record<keyof T, string>>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const setFieldTouched = useCallback((name: keyof T, isTouched = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
  }, []);

  const validate = useCallback(() => {
    if (!validator) return true;
    
    const validationErrors = validator(values);
    setErrors(validationErrors);
    
    return Object.keys(validationErrors).length === 0;
  }, [values, validator]);

  const handleSubmit = useCallback(
    (onSubmit: (values: T) => Promise<void> | void) => 
      async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        setIsSubmitting(true);
        
        // Mark all fields as touched
        const allTouched = Object.keys(values).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {}
        );
        setTouched(allTouched);
        
        if (validate()) {
          try {
            await onSubmit(values);
          } catch (error) {
            console.error('Form submission error:', error);
          }
        }
        
        setIsSubmitting(false);
      },
    [values, validate]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    setValue,
    setFieldTouched,
    validate,
    handleSubmit,
    reset
  };
}

// =================== PAGINATION HOOK ===================

export function usePagination<T>(
  fetchFunction: (page: number, limit: number) => Promise<{ data: T[]; hasNext: boolean }>,
  pageSize = 20
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchFunction(page, pageSize);
      
      setData(prev => [...prev, ...result.data]);
      setHasNext(result.hasNext);
      setPage(prev => prev + 1);
    } catch (error: any) {
      setError(error.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, page, pageSize, loading]);

  const refresh = useCallback(async () => {
    setData([]);
    setPage(1);
    setError(null);
    
    try {
      setLoading(true);
      const result = await fetchFunction(1, pageSize);
      setData(result.data);
      setHasNext(result.hasNext);
      setPage(2);
    } catch (error: any) {
      setError(error.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, pageSize]);

  return {
    data,
    loading,
    error,
    hasNext,
    loadMore,
    refresh
  };
}