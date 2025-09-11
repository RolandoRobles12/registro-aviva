import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreService } from '../../services/firestore';
import { TimeOffRequestFilters } from '../../components/admin/TimeOffRequestFilters';
import { TimeOffRequestTable } from '../../components/admin/TimeOffRequestTable';
import { TimeOffRequestStats } from '../../components/admin/TimeOffRequestStats';
import { LoadingSpinner, Alert } from '../../components/ui';
import { TimeOffRequest, TimeOffFilters } from '../../types';

export default function AdminTimeOffRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TimeOffFilters>({});

  useEffect(() => {
    loadRequests();
  }, [filters]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const requestsList = await FirestoreService.getTimeOffRequests(filters);
      setRequests(requestsList);
    } catch (error) {
      console.error('Error loading time off requests:', error);
      setError('Error cargando solicitudes de días libres');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: TimeOffFilters) => {
    setFilters(newFilters);
  };

  const handleRequestUpdate = async (
    requestId: string,
    status: 'approved' | 'rejected',
    comment?: string
  ) => {
    if (!user) return;

    try {
      await FirestoreService.updateTimeOffRequest(requestId, status, user.id, comment);
      await loadRequests(); // Reload data
    } catch (error) {
      console.error('Error updating request:', error);
      setError('Error actualizando solicitud');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Solicitudes de Días Libres
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Administra las solicitudes de vacaciones, días Aviva e incapacidades del personal.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {requests.filter(r => r.status === 'pending').length} pendientes
              </div>
              <div className="text-xs text-gray-500">
                {requests.length} total
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          type="error"
          message={error}
          dismissible
          onDismiss={() => setError(null)}
        />
      )}

      {/* Filters */}
      <TimeOffRequestFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Stats */}
      {requests.length > 0 && (
        <TimeOffRequestStats requests={requests} />
      )}

      {/* Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Lista de Solicitudes
            {requests.length > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({requests.length} resultados)
              </span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <TimeOffRequestTable
            requests={requests}
            onUpdate={handleRequestUpdate}
          />
        )}
      </div>
    </div>
  );
}