import React, { useState } from 'react';
import { Modal, Button } from '../ui';
import { CameraCapture as CameraCaptureType } from '../../types';

interface CameraCaptureProps {
  onCapture: (capture: CameraCaptureType) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const [error, setError] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const blob = new Blob([file], { type: file.type });
      
      const capture: CameraCaptureType = {
        file,
        blob,
        dataUrl
      };

      onCapture(capture);
    };

    reader.onerror = () => {
      setError('Error al leer el archivo');
    };

    reader.readAsDataURL(file);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Capturar Foto">
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <p className="text-center text-gray-600">
            Selecciona una imagen o usa tu cámara
          </p>
          
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}