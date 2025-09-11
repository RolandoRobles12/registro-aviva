import React, { useState, useEffect } from 'react';
import { FirestoreService } from '../../services/firestore';
import { LocationsTable } from '../../components/admin/LocationsTable';
import { LocationForm } from '../../components/admin/LocationForm';
import { ImportLocationsModal } from '../../components/admin/ImportLocationsModal';
import { LoadingSpinner, Alert, Button, Modal } from '../../components/ui';
import { Kiosk } from '../../types';
import { PlusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

export default function AdminLocations() {
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<Kiosk | null>(null);

  useEffect(() => {
    loadKiosks();
  }, []);

  const loadKiosks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all kiosks (including inactive)
      const kiosksList = await FirestoreService.getActiveKiosks(); // TODO: Update to get all kiosks
      setKiosks(kiosksList);
    } catch (error) {
      console.error('Error loading kiosks:', error);
      setError('Error cargando ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleKioskSave = async (kioskData: Omit<Kiosk, 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null);
      await FirestoreService.saveKiosk(kioskData);
      await loadKiosks();
      setShowForm(false);
      setEditingKiosk(null);
      setSuccess(kioskData.id ? 'Kiosco actualizado correctamente' : 'Kiosco creado correctamente');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving kiosk:', error);
      setError('Error guardando el kiosco');
    }
  };

  const handleEdit = (kiosk: Kiosk) => {
    setEditingKiosk(kiosk);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingKiosk(null);
    setShowForm(true);
  };

  const handleImportSuccess = () => {
    loadKiosks();
    setShowImport(false);
    setSuccess('Kioscos importados correctamente');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingKiosk(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Ubicaciones y Geocercas
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Administra la lista maestra de kioscos y sus parámetros.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowImport(true)}
              leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
            >
              Importar CSV
            </Button>
            <Button
              variant="primary"
              onClick={handleAdd}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Añadir Kiosco
            </Button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <Alert
          type="error"
          message={error}
          dismissible
          onDismiss={() => setError(null)}
        />
      )}

      {success && (
        <Alert
          type="success"
          message={success}
          dismissible
          onDismiss={() => setSuccess(null)}
        />
      )}

      {/* Import Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">¿Cómo importar ubicaciones?</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Para añadir o actualizar kioscos masivamente, sube un archivo CSV con las siguientes columnas. El orden y el nombre de las columnas debe ser exacto:</p>
              <code className="mt-2 block bg-blue-100 p-2 rounded text-xs">
                id,name,latitude,longitude,city,state,type,active,radiusOverride
              </code>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li><strong>id:</strong> Identificador único para el kiosco. Es obligatorio tanto para kioscos nuevos como para actualizaciones.</li>
                <li><strong>type:</strong> Debe ser "Bodega Aurrera" o "Kiosco Aviva Tu Compra".</li>
                <li><strong>active:</strong> "true" o "false".</li>
                <li><strong>radiusOverride:</strong> Un número (ej: 200) o dejar en blanco para usar el radio por defecto.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Lista de Kioscos
            {kiosks.length > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({kiosks.length} total)
              </span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <LocationsTable
            kiosks={kiosks}
            onEdit={handleEdit}
            onUpdate={loadKiosks}
          />
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <Modal
          isOpen={true}
          onClose={handleFormClose}
          title={editingKiosk ? 'Editar Kiosco' : 'Añadir Nuevo Kiosco'}
          size="lg"
        >
          <LocationForm
            kiosk={editingKiosk}
            onSave={handleKioskSave}
            onCancel={handleFormClose}
          />
        </Modal>
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportLocationsModal
          isOpen={true}
          onClose={() => setShowImport(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}