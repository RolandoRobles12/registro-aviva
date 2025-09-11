import React, { useEffect } from 'react';
import { useCamera } from '../../hooks';
import { Modal, Button, Alert } from '../ui';
import { CameraCapture as CameraCaptureType } from '../../types';

interface CameraCaptureProps {
  onCapture: (capture: CameraCaptureType) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const {
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
  } = useCamera();

  useEffect(() => {
    openCamera();
    return () => closeCamera();
  }, [openCamera, closeCamera]);

  const handleCapture = async () => {
    try {
      const capture = await capturePhoto();
      if (capture) {
        onCapture(capture);
      }
    } catch (error: any) {
      console.error('Error capturing photo:', error);
    }
  };

  const handleClose = () => {
    closeCamera();
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={handleClose} title="Capturar Foto" size="lg">
      <div className="space-y-4">
        {error && (
          <Alert type="error" message={error} />
        )}

        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Iniciando cámara...</p>
            </div>
          </div>
        )}

        {isOpen && !error && (
          <div className="space-y-4">
            {/* Video Preview */}
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-64 sm:h-80 object-cover"
                autoPlay
                playsInline
                muted
              />
              
              {/* Camera Switch Button */}
              <button
                type="button"
                onClick={switchCamera}
                className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Camera Mode Indicator */}
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                {facingMode === 'user' ? 'Cámara Frontal' : 'Cámara Trasera'}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center space-x-4">
              <Button
                variant="secondary"
                onClick={handleClose}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCapture}
                leftIcon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              >
                Capturar Foto
              </Button>
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600 text-center">
                Asegúrate de estar en una buena posición y con buena iluminación antes de capturar la foto.
              </p>
            </div>
          </div>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </Modal>
  );
}