// src/pages/admin/Locations.tsx - Versión corregida
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LocationsTable } from '../../components/admin/LocationsTable';
import { LocationForm } from '../../components/admin/LocationForm';
import { ImportLocationsModal } from '../../components/admin/ImportLocationsModal';
import { LoadingSpinner, Alert, Button, Modal } from '../../components/ui';
import { Kiosk } from '../../types';
import { PlusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

// Funciones locales para manejar kioscos
const saveKiosk = async (kioskData: Omit<Kiosk, 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    console.log('Guardando kiosko:', kioskData);
    
    // Importar las funciones necesarias
    const { addDoc, collection, serverTimestamp, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
    
    // Validar datos
    if (!kioskData.id || !kioskData.name || !kioskData.city) {
      throw new Error('Faltan campos obligatorios');
    }

    // Verificar si ya existe un kiosko con ese ID personalizado
    const existingQuery = query(
      collection(db, 'kiosks'),
      where('id', '==', kioskData.id)
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      // Actualizar existente
      const existingDoc = existingSnapshot.docs[0];
      await updateDoc(doc(db, 'kiosks', existingDoc.id), {
        ...kioskData,
        updatedAt: serverTimestamp()
      });
      return existingDoc.id;
    } else {
      // Crear nuevo
      const docRef = await addDoc(collection(db, 'kiosks'), {
        ...kioskData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    }
  } catch (error) {
    console.error('Error guardando kiosko:', error);
    throw error;
  }
};

const loadAllKiosks = async (): Promise<Kiosk[]> => {
  try {
    console.log('Cargando kioscos...');
    
    // Intentar con orden primero
    try {
      const q = query(collection(db, 'kiosks'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Kiosk[];
    } catch (orderError) {
      console.log('No se pudo ordenar, intentando consulta simple...');
      // Si falla el orderBy, intentar sin él
      const q = query(collection(db, 'kiosks'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Kiosk[];
    }
  } catch (error) {
    console.error('Error cargando kioscos:', error);
    throw error;
  }
};

export default function AdminLocations() {
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<Kiosk | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadKiosks();
  }, []);

  const loadKiosks = async () => {
    try {
      setLoading(true);
      setError(null);

      const kiosksList = await loadAllKiosks();
      console.log('Kioscos cargados:', kiosksList);
      setKiosks(kiosksList);
    } catch (error: any) {
      console.error('Error loading kiosks:', error);
      setError(`Error cargando ubicaciones: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKioskSave = async (kioskData: Omit<Kiosk, 'createdAt' | 'updatedAt'>) => {
    try {
      setSaving(true);
      setError(null);
      
      console.log('Datos del kiosko a guardar:', kioskData);
      
      await saveKiosk(kioskData);
      await loadKiosks();
      setShowForm(false);
      setEditingKiosk(null);
      setSuccess(editingKiosk ? 'Kiosco actualizado correctamente' : 'Kiosco creado correctamente');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error saving kiosk:', error);
      setError(`Error guardando el kiosco: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (kiosk: Kiosk) => {
    console.log('Editando kiosko:', kiosk);
    setEditingKiosk(kiosk);
    setShowForm(true);
  };

  const handleAdd = () => {
    console.log('Añadiendo nuevo kiosko');
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
    setError(null);
  };

  // Test Firestore connection
  const testConnection = async () => {
    try {
      console.log('Probando conexión a Firestore...');
      const testQuery = query(collection(db, 'kiosks'));
      await getDocs(testQuery);
      setSuccess('Conexión a Firestore exitosa');
    } catch (error: any) {
      setError(`Error de conexión: ${error.message}`);
    }
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
            {/* Debug button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={testConnection}
            >
              Test DB
            </Button>
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
                <li><strong>id:</strong> Identificador único para el kiosco (ej: 0001, 0002)</li>
                <li><strong>type:</strong> Debe ser "BA", "Aviva_Contigo", "Aviva_Tu_Negocio", "Casa_Marchand", "Construrama" o "Disensa"</li>
                <li><strong>active:</strong> "true" o "false"</li>
                <li><strong>radiusOverride:</strong> Un número (ej: 200) o dejar en blanco para usar el radio por defecto</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {import.meta.env.DEV && (
        <div className="bg-gray-100 rounded-lg p-4 text-xs text-gray-600">
          <strong>Debug Info:</strong>
          <br />Total kioscos: {kiosks.length}
          <br />Loading: {loading.toString()}
          <br />Error: {error || 'None'}
          <br />Firebase Config: {db.app.options.projectId}
        </div>
      )}

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
            <p className="mt-2 text-sm text-gray-500">Cargando kioscos...</p>
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
            saving={saving}
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