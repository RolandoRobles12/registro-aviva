import React, { useState, useRef } from 'react';
import { Modal, Button, Alert } from '../ui';
import { FirestoreService } from '../../services/firestore';
import { Kiosk, ProductType } from '../../types';
import { validateKioskId, validateCoordinates } from '../../utils/validators';
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline';

interface ImportLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportLocationsModal({ isOpen, onClose, onSuccess }: ImportLocationsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Por favor selecciona un archivo CSV');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Parse preview
    try {
      const text = await selectedFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Validate headers
      const requiredHeaders = ['id', 'name', 'latitude', 'longitude', 'city', 'state', 'type', 'active'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        setError(`Faltan columnas requeridas: ${missingHeaders.join(', ')}`);
        return;
      }

      // Parse preview data (first 5 rows)
      const previewData = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim());
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] || '';
          return obj;
        }, {} as any);
      });

      setPreview(previewData);
    } catch (error) {
      setError('Error leyendo el archivo CSV');
    }
  };

  const validateRow = (row: any, index: number): string[] => {
    const errors: string[] = [];

    // Validate ID
    if (!row.id || !validateKioskId(row.id)) {
      errors.push(`Fila ${index + 2}: ID inválido (debe ser 4 dígitos)`);
    }

    // Validate name
    if (!row.name?.trim()) {
      errors.push(`Fila ${index + 2}: Nombre es requerido`);
    }

    // Validate coordinates
    const lat = parseFloat(row.latitude);
    const lng = parseFloat(row.longitude);
    if (isNaN(lat) || isNaN(lng) || !validateCoordinates(lat, lng)) {
      errors.push(`Fila ${index + 2}: Coordenadas inválidas`);
    }

    // Validate required fields
    if (!row.city?.trim()) {
      errors.push(`Fila ${index + 2}: Ciudad es requerida`);
    }
    if (!row.state?.trim()) {
      errors.push(`Fila ${index + 2}: Estado es requerido`);
    }

    // Validate type
    const validTypes = ['Bodega Aurrera', 'Kiosco Aviva Tu Compra', 'BA', 'Aviva_Contigo', 'Casa_Marchand', 'Construrama', 'Disensa'];
    if (!validTypes.includes(row.type)) {
      errors.push(`Fila ${index + 2}: Tipo de producto inválido`);
    }

    // Validate active status
    if (!['true', 'false'].includes(row.active?.toLowerCase())) {
      errors.push(`Fila ${index + 2}: Campo 'active' debe ser 'true' o 'false'`);
    }

    return errors;
  };

  const convertRowToKiosk = (row: any): Omit<Kiosk, 'createdAt' | 'updatedAt'> => {
    // Map product types
    let productType: ProductType = 'BA';
    if (row.type === 'Bodega Aurrera' || row.type === 'BA') {
      productType = 'BA';
    } else if (row.type === 'Kiosco Aviva Tu Compra' || row.type === 'Aviva_Contigo') {
      productType = 'Aviva_Contigo';
    } else if (row.type === 'Casa_Marchand') {
      productType = 'Casa_Marchand';
    } else if (row.type === 'Construrama') {
      productType = 'Construrama';
    } else if (row.type === 'Disensa') {
      productType = 'Disensa';
    }

    return {
      id: row.id,
      name: row.name,
      city: row.city,
      state: row.state,
      productType,
      coordinates: {
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude)
      },
      radiusOverride: row.radiusOverride ? parseInt(row.radiusOverride) : undefined,
      status: row.active?.toLowerCase() === 'true' ? 'active' : 'inactive'
    };
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setProcessing(true);
      setError(null);

      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Parse all data
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] || '';
          return obj;
        }, {} as any);
      });

      // Validate all rows
      const allErrors: string[] = [];
      rows.forEach((row, index) => {
        const rowErrors = validateRow(row, index);
        allErrors.push(...rowErrors);
      });

      if (allErrors.length > 0) {
        setError(allErrors.slice(0, 10).join('\n') + (allErrors.length > 10 ? '\n...' : ''));
        return;
      }

      // Convert to kiosk objects
      const kiosks = rows.map(convertRowToKiosk);

      // Import to Firestore
      await FirestoreService.batchImportKiosks(kiosks);

      onSuccess();
    } catch (error) {
      console.error('Error importing kiosks:', error);
      setError('Error importando kioscos');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Kioscos desde CSV" size="xl">
      <div className="space-y-6">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar archivo CSV
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                >
                  <span>Sube un archivo</span>
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </label>
                <p className="pl-1">o arrastra y suelta</p>
              </div>
              <p className="text-xs text-gray-500">CSV hasta 10MB</p>
            </div>
          </div>
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Archivo seleccionado: {file.name}
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert type="error" message={error} />
        )}

        {/* Preview */}
        {preview && preview.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Vista previa (primeras 5 filas)
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ciudad</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Activo</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((row, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 text-xs text-gray-900">{row.id}</td>
                      <td className="px-3 py-2 text-xs text-gray-900">{row.name}</td>
                      <td className="px-3 py-2 text-xs text-gray-900">{row.city}</td>
                      <td className="px-3 py-2 text-xs text-gray-900">{row.type}</td>
                      <td className="px-3 py-2 text-xs text-gray-900">{row.active}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={handleClose} disabled={processing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            loading={processing}
            disabled={!file || !!error}
          >
            Importar Kioscos
          </Button>
        </div>
      </div>
    </Modal>
  );
}