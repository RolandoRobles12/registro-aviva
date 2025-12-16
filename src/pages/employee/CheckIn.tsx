import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation, useCamera, useAsyncState } from '../../hooks';
import { FirestoreService } from '../../services/firestore';
import { StorageService } from '../../services/storage';
import { CheckInForm } from '../../components/forms/CheckInForm';
import { LocationStatus } from '../../components/common/LocationStatus';
import { TodayCheckIns } from '../../components/common/TodayCheckIns';
import { Alert, LoadingSpinner } from '../../components/ui';
import { CheckIn, Kiosk } from '../../types';

export default function CheckInPage() {
  const { user } = useAuth();
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [todayCheckIns, setTodayCheckIns] = useState<CheckIn[]>([]);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  
  const {
    data: checkInResult,
    loading: submitting,
    error: submissionError,
    execute: submitCheckIn,
    reset: resetSubmission
  } = useAsyncState<string>();

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    if (!user) return;

    try {
      const [kiosksList, todaysList] = await Promise.all([
        FirestoreService.getActiveKiosks(),
        FirestoreService.getTodayCheckIns(user.id)
      ]);
      
      setKiosks(kiosksList);
      setTodayCheckIns(todaysList);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const handleCheckInSubmit = async (
    formData: any,
    location: { latitude: number; longitude: number; accuracy?: number },
    photo?: File
  ) => {
    if (!user) return;

    try {
      // Create check-in first
      const checkInId = await submitCheckIn(async () => {
        let photoUrl: string | undefined;

        // Upload photo if provided
        if (photo) {
          photoUrl = await StorageService.uploadCheckInPhoto(
            user.id,
            photo,
            `temp_${Date.now()}`
          );
        }

        return await FirestoreService.createCheckIn(
          user.id,
          formData,
          location,
          photoUrl
        );
      });

      // Reload today's check-ins
      const updatedCheckIns = await FirestoreService.getTodayCheckIns(user.id);
      setTodayCheckIns(updatedCheckIns);
      setSubmissionSuccess(true);

      // Reset success message after 5 seconds
      setTimeout(() => setSubmissionSuccess(false), 5000);
    } catch (error) {
      console.error('Error submitting check-in:', error);
    }
  };

  const handleRetry = () => {
    resetSubmission();
    setSubmissionSuccess(false);
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner size="lg" />
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
              Registrar Check-in
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Completa el formulario para registrar tu asistencia.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {user.name}
              </div>
              <div className="text-xs text-gray-500">
                {user.role === 'promotor' ? 'Promotor' : user.role}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {submissionSuccess && (
        <Alert
          type="success"
          title="¡Check-in registrado exitosamente!"
          message="Tu asistencia ha sido registrada correctamente."
          dismissible
          onDismiss={() => setSubmissionSuccess(false)}
        />
      )}

      {/* Error Message */}
      {submissionError && (
        <Alert
          type="error"
          title="Error al registrar check-in"
          message={submissionError}
          dismissible
          onDismiss={handleRetry}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Check-in Form */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Formulario de Registro
              </h2>
            </div>
            <div className="p-6">
              <CheckInForm
                kiosks={kiosks}
                onSubmit={handleCheckInSubmit}
                loading={submitting}
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Location Status */}
          <LocationStatus />

          {/* Today's Check-ins */}
          <TodayCheckIns checkIns={todayCheckIns} />
        </div>
      </div>
    </div>
  );
}