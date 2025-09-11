import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAsyncState } from '../../hooks';
import { FirestoreService } from '../../services/firestore';
import { TimeOffRequestForm } from '../../components/forms/TimeOffRequestForm';
import { TimeOffRequestList } from '../../components/common/TimeOffRequestList';
import { Alert } from '../../components/ui';
import { TimeOffRequest, TimeOffFormData } from '../../types';

export default function TimeOffRequestPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const {
    loading: submitting,
    error: submissionError,
    execute: submitRequest,
    reset: resetSubmission
  } = useAsyncState<string>();

  // Load user's requests
  useEffect(() => {
    loadUserRequests();
  }, [user]);

  const loadUserRequests = async () => {
    if (!user) return;

    try {
      // Get requests for current user
      const userRequests = await FirestoreService.getTimeOffRequests({
        // Add user filter when implemented in service
      });
      
      // Filter for current user (temporary until service supports user filtering)
      const filteredRequests = userRequests.filter(req => req.userId === user.id);
      setRequests(filteredRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const handleRequestSubmit = async (formData: TimeOffFormData) => {
    if (!user) return;

    try {
      await submitRequest(async () => {
        return await FirestoreService.createTimeOffRequest(user.id, formData);
      });

      // Reload requests
      await loadUserRequests();
      setSubmissionSuccess(true);

      // Reset success message after 5 seconds
      setTimeout(() => setSubmissionSuccess(false), 5000);
    } catch (error) {
      console.error('Error submitting request:', error);
    }
  };

  const handleRetry = () => {
    resetSubmission();
    setSubmissionSuccess(false);
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Solicitar Días Libres
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Solicita vacaciones, días Aviva o reporta incapacidades.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {user.name}
              </div>
              <div className="text-xs text-gray-500">
                {requests.filter(r => r.status === 'pending').length} solicitudes pendientes
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {submissionSuccess && (
        <Alert
          type="success"
          title="¡Solicitud enviada exitosamente!"
          message="Tu solicitud ha sido enviada y está pendiente de aprobación."
          dismissible
          onDismiss={() => setSubmissionSuccess(false)}
        />
      )}

      {/* Error Message */}
      {submissionError && (
        <Alert
          type="error"
          title="Error al enviar solicitud"
          message={submissionError}
          dismissible
          onDismiss={handleRetry}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Form */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Nueva Solicitud
              </h2>
            </div>
            <div className="p-6">
              <TimeOffRequestForm
                onSubmit={handleRequestSubmit}
                loading={submitting}
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div>
          <TimeOffRequestList requests={requests} />
        </div>
      </div>
    </div>
  );
}