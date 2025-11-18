import React, { useState, useEffect } from 'react';
import { HubForm } from '../../components/admin/HubForm';
import { HubsTable } from '../../components/admin/HubsTable';
import { Button, Alert, Modal } from '../../components/ui';
import { Hub } from '../../types';
import { HubService } from '../../services/hubs';
import { useAuth } from '../../contexts/AuthContext';
import {
  PlusIcon,
  CubeIcon,
  ChartBarIcon,
  MapPinIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

export default function Hubs() {
  const { user } = useAuth();
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [hubStats, setHubStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hubToDelete, setHubToDelete] = useState<Hub | null>(null);

  useEffect(() => {
    loadHubs();
  }, []);

  const loadHubs = async () => {
    try {
      setLoading(true);
      const data = await HubService.getAllHubs();
      setHubs(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los hubs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHub = () => {
    setSelectedHub(null);
    setShowForm(true);
  };

  const handleEditHub = (hub: Hub) => {
    setSelectedHub(hub);
    setShowForm(true);
  };

  const handleSaveHub = async (hubData: Partial<Hub>) => {
    try {
      if (selectedHub) {
        // Update existing hub
        await HubService.updateHub(selectedHub.id, hubData, user?.id || 'system');
        setSuccess('Hub actualizado exitosamente');
      } else {
        // Create new hub
        await HubService.createHub(hubData as Omit<Hub, 'id' | 'createdAt' | 'updatedAt'>, user?.id || 'system');
        setSuccess('Hub creado exitosamente');
      }

      setShowForm(false);
      setSelectedHub(null);
      await loadHubs();

      // Auto-clear success message
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el hub');
    }
  };

  const handleDeleteHub = (hub: Hub) => {
    setHubToDelete(hub);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!hubToDelete) return;

    try {
      await HubService.deleteHub(hubToDelete.id);
      setSuccess('Hub eliminado exitosamente');
      setShowDeleteConfirm(false);
      setHubToDelete(null);
      await loadHubs();

      // Auto-clear success message
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el hub');
      setShowDeleteConfirm(false);
    }
  };

  const handleToggleStatus = async (hub: Hub) => {
    try {
      await HubService.toggleHubStatus(hub.id, user?.id || 'system');
      setSuccess(`Hub ${hub.status === 'active' ? 'desactivado' : 'activado'} exitosamente`);
      await loadHubs();

      // Auto-clear success message
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Error al cambiar el estado del hub');
    }
  };

  const handleViewDetails = async (hub: Hub) => {
    try {
      setSelectedHub(hub);
      setShowDetails(true);
      const stats = await HubService.getHubStats(hub.id);
      setHubStats(stats);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las estadísticas del hub');
    }
  };

  const handleAutoAssignKiosks = async (hub: Hub) => {
    try {
      const count = await HubService.autoAssignKiosksToHub(hub.id);
      setSuccess(`${count} kioscos asignados automáticamente al hub ${hub.name}`);

      // Reload stats if details modal is open
      if (showDetails && selectedHub?.id === hub.id) {
        const stats = await HubService.getHubStats(hub.id);
        setHubStats(stats);
      }

      // Auto-clear success message
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Error al asignar kioscos automáticamente');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CubeIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Hubs</h1>
            <p className="text-sm text-gray-600">
              Organiza tus registros por estados geográficos y productos
            </p>
          </div>
        </div>
        <Button onClick={handleCreateHub}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Nuevo Hub
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert
          type="error"
          title="Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {success && (
        <Alert
          type="success"
          title="Éxito"
          message={success}
          onClose={() => setSuccess(null)}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Hubs</p>
              <p className="text-2xl font-bold text-gray-900">{hubs.length}</p>
            </div>
            <CubeIcon className="h-12 w-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hubs Activos</p>
              <p className="text-2xl font-bold text-green-600">
                {hubs.filter(h => h.status === 'active').length}
              </p>
            </div>
            <ChartBarIcon className="h-12 w-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Estados Cubiertos</p>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(hubs.flatMap(h => h.states)).size}
              </p>
            </div>
            <MapPinIcon className="h-12 w-12 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Hubs Table */}
      <div className="bg-white rounded-lg shadow">
        <HubsTable
          hubs={hubs}
          onEdit={handleEditHub}
          onDelete={handleDeleteHub}
          onToggleStatus={handleToggleStatus}
          onViewDetails={handleViewDetails}
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedHub(null);
          }}
          title={selectedHub ? 'Editar Hub' : 'Crear Nuevo Hub'}
        >
          <HubForm
            hub={selectedHub}
            onSave={handleSaveHub}
            onCancel={() => {
              setShowForm(false);
              setSelectedHub(null);
            }}
          />
        </Modal>
      )}

      {/* Details Modal */}
      {showDetails && selectedHub && (
        <Modal
          isOpen={showDetails}
          onClose={() => {
            setShowDetails(false);
            setSelectedHub(null);
            setHubStats(null);
          }}
          title={`Detalles: ${selectedHub.name}`}
        >
          <div className="space-y-6">
            {/* Hub Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Información General</h3>
              {selectedHub.description && (
                <p className="text-sm text-gray-600 mb-4">{selectedHub.description}</p>
              )}

              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Estado</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedHub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedHub.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Creado por</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedHub.createdBy}</dd>
                </div>
              </dl>
            </div>

            {/* States & Products */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Estados ({selectedHub.states.length})
                </h4>
                <div className="flex flex-wrap gap-1">
                  {selectedHub.states.map(state => (
                    <span
                      key={state}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {state}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Productos ({selectedHub.productTypes.length})
                </h4>
                <div className="flex flex-wrap gap-1">
                  {selectedHub.productTypes.map(product => (
                    <span
                      key={product}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats */}
            {hubStats && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Estadísticas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Kioscos</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {hubStats.activeKiosks} / {hubStats.totalKiosks}
                        </p>
                      </div>
                      <MapPinIcon className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">Usuarios</p>
                        <p className="text-2xl font-bold text-green-900">
                          {hubStats.activeUsers} / {hubStats.totalUsers}
                        </p>
                      </div>
                      <UserGroupIcon className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t">
              <Button
                onClick={() => handleAutoAssignKiosks(selectedHub)}
                variant="secondary"
                className="w-full"
              >
                Asignar Kioscos Automáticamente
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && hubToDelete && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setHubToDelete(null);
          }}
          title="Confirmar Eliminación"
        >
          <div className="space-y-4">
            <Alert
              type="warning"
              title="Atención"
              message="Esta acción no se puede deshacer. Asegúrate de que el hub no tiene kioscos o usuarios asociados."
            />

            <p className="text-sm text-gray-600">
              ¿Estás seguro de que deseas eliminar el hub <strong>{hubToDelete.name}</strong>?
            </p>

            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setHubToDelete(null);
                }}
                variant="secondary"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Eliminar Hub
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
