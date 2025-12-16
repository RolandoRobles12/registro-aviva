import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreService } from '../../services/firestore';
import { PhotoValidationService } from '../../services/photoValidationService';
import { PhotoValidationBadge } from '../../components/common/PhotoValidationBadge';
import { Alert, Button, LoadingSpinner } from '../../components/ui';
import { CheckIn } from '../../types';
import { formatTimestamp } from '../../utils/formatters';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function PhotoReview() {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cargar check-ins que requieren revisión
  useEffect(() => {
    loadPendingReviews();
  }, []);

  const loadPendingReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener todos los check-ins recientes
      const allCheckIns = await FirestoreService.getCheckIns({
        // Últimos 7 días
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      // Filtrar solo los que requieren revisión manual
      const pendingReviews = allCheckIns.filter(
        (checkIn) =>
          checkIn.photoValidation &&
          (checkIn.photoValidation.status === 'needs_review' ||
            checkIn.photoValidation.status === 'pending')
      );

      setCheckIns(pendingReviews);
    } catch (err: any) {
      console.error('Error cargando revisiones pendientes:', err);
      setError(err.message || 'Error al cargar revisiones pendientes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (checkIn: CheckIn) => {
    if (!window.confirm('¿Estás seguro de aprobar esta foto?')) {
      return;
    }

    try {
      setReviewing(true);
      setError(null);

      await PhotoValidationService.approvePhoto(checkIn.id, reviewNotes || undefined);

      setSuccessMessage(`Foto aprobada exitosamente para ${checkIn.userName}`);
      setReviewNotes('');
      setSelectedCheckIn(null);

      // Recargar lista
      await loadPendingReviews();

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error aprobando foto:', err);
      setError(err.message || 'Error al aprobar la foto');
    } finally {
      setReviewing(false);
    }
  };

  const handleReject = async (checkIn: CheckIn) => {
    if (!reviewNotes.trim()) {
      setError('Debes proporcionar una razón para rechazar la foto');
      return;
    }

    if (!window.confirm('¿Estás seguro de rechazar esta foto?')) {
      return;
    }

    try {
      setReviewing(true);
      setError(null);

      await PhotoValidationService.rejectPhoto(checkIn.id, reviewNotes);

      setSuccessMessage(`Foto rechazada para ${checkIn.userName}`);
      setReviewNotes('');
      setSelectedCheckIn(null);

      // Recargar lista
      await loadPendingReviews();

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error rechazando foto:', err);
      setError(err.message || 'Error al rechazar la foto');
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Revisión de Fotos</h1>
        <p className="mt-2 text-sm text-gray-600">
          Revisa las fotos de check-in que requieren validación manual
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6">
          <Alert type="success" message={successMessage} />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6">
          <Alert type="error" title="Error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Pendientes</div>
          <div className="mt-1 text-3xl font-semibold text-gray-900">{checkIns.length}</div>
        </div>
      </div>

      {/* Check-ins List */}
      {checkIns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 text-4xl mb-4">✓</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay fotos pendientes de revisión
          </h3>
          <p className="text-sm text-gray-500">
            Todas las fotos han sido procesadas correctamente
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {checkIns.map((checkIn) => (
            <div key={checkIn.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Photo */}
              {checkIn.photoUrl && (
                <div className="relative h-64 bg-gray-100">
                  <img
                    src={checkIn.photoUrl}
                    alt="Foto de check-in"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Info */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{checkIn.userName}</h3>
                    <p className="text-sm text-gray-500">{formatTimestamp(checkIn.timestamp)}</p>
                  </div>
                  {checkIn.photoValidation && (
                    <PhotoValidationBadge validation={checkIn.photoValidation} variant="compact" />
                  )}
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  <div>
                    <span className="font-medium">Kiosco:</span> {checkIn.kioskName}
                  </div>
                  <div>
                    <span className="font-medium">Tipo:</span> {checkIn.type}
                  </div>
                </div>

                {/* Validation Details */}
                {checkIn.photoValidation && (
                  <div className="mb-4">
                    <PhotoValidationBadge
                      validation={checkIn.photoValidation}
                      variant="detailed"
                    />
                  </div>
                )}

                {/* Review Form */}
                {selectedCheckIn?.id === checkIn.id ? (
                  <div className="space-y-3 border-t pt-4">
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Notas de revisión (opcional para aprobar, obligatorio para rechazar)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      rows={3}
                    />

                    <div className="flex space-x-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApprove(checkIn)}
                        loading={reviewing}
                        disabled={reviewing}
                        fullWidth
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Aprobar
                      </Button>

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleReject(checkIn)}
                        loading={reviewing}
                        disabled={reviewing || !reviewNotes.trim()}
                        fullWidth
                      >
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Rechazar
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedCheckIn(null);
                          setReviewNotes('');
                        }}
                        disabled={reviewing}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t pt-4">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedCheckIn(checkIn)}
                      fullWidth
                    >
                      Revisar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
