import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AttendanceService } from '../../services/attendance';
import { AttendanceIssuesTable } from '../../components/admin/AttendanceIssuesTable';
import { LoadingSpinner, Alert, Button, Select } from '../../components/ui';
import { AttendanceIssue } from '../../types';
import { PRODUCT_TYPES } from '../../utils/constants';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  FunnelIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function AdminAttendanceIssues() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<AttendanceIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [productFilter, setProductFilter] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [showDiagnosis, setShowDiagnosis] = useState(false);

  const availableProducts = useMemo(() => {
    const types = [...new Set(issues.map(i => i.productType).filter(Boolean))].sort();
    return types.map(pt => ({
      value: pt,
      label: PRODUCT_TYPES[pt as keyof typeof PRODUCT_TYPES] || pt
    }));
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (!productFilter) return issues;
    return issues.filter(i => i.productType === productFilter);
  }, [issues, productFilter]);

  useEffect(() => {
    loadIssues();
  }, [showResolved]);

  const loadIssues = async () => {
    try {
      setLoading(true);
      setError(null);

      const issuesList = await AttendanceService.getAttendanceIssues({
        resolved: showResolved ? undefined : false
      });
      setIssues(issuesList);

      // Si no hay faltas, ejecutar diagnóstico
      if (issuesList.length === 0) {
        const diagnosisResult = await AttendanceService.diagnoseMissingIssues();
        setDiagnosis(diagnosisResult);
        setShowDiagnosis(true);
      } else {
        setShowDiagnosis(false);
      }
    } catch (error) {
      console.error('Error loading attendance issues:', error);
      setError('Error cargando las faltas de asistencia');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (issueId: string, resolution: string) => {
    if (!user) return;

    try {
      await AttendanceService.resolveAttendanceIssue(
        issueId,
        user.name || user.email,
        resolution
      );

      setSuccess('Falta resuelta correctamente');
      setTimeout(() => setSuccess(null), 3000);

      await loadIssues(); // Reload data
    } catch (error) {
      console.error('Error resolving issue:', error);
      setError('Error al resolver la falta');
    }
  };

  const handleDetectIssues = async () => {
    try {
      setLoading(true);
      setError(null);

      const detectedIssues = await AttendanceService.detectMissingCheckIns();

      setSuccess(`Se detectaron ${detectedIssues.length} nuevas faltas`);
      setTimeout(() => setSuccess(null), 5000);

      await loadIssues();
    } catch (error) {
      console.error('Error detecting issues:', error);
      setError('Error al detectar faltas automáticamente');
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = filteredIssues.filter(i => !i.resolved).length;
  const resolvedCount = filteredIssues.filter(i => i.resolved).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 mr-3 text-amber-500" />
              Gestión de Faltas de Asistencia
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Administra y corrige las faltas automáticas detectadas por el sistema
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={handleDetectIssues}
              leftIcon={<ArrowPathIcon className="h-4 w-4" />}
              disabled={loading}
            >
              Detectar Faltas
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-10 w-10 text-amber-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Faltas Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-10 w-10 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Faltas Resueltas</p>
              <p className="text-2xl font-bold text-gray-900">{resolvedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FunnelIcon className="h-10 w-10 text-indigo-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total de Faltas</p>
              <p className="text-2xl font-bold text-gray-900">{issues.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <Alert
          type="success"
          message={success}
          dismissible
          onDismiss={() => setSuccess(null)}
        />
      )}

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
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
          <div className="flex flex-wrap items-center gap-4">
            {/* Product filter */}
            <div className="flex items-center gap-2">
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos los productos</option>
                {availableProducts.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {productFilter && (
                <button
                  onClick={() => setProductFilter('')}
                  className="text-gray-400 hover:text-gray-600"
                  title="Limpiar filtro de producto"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Resolved toggle */}
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Mostrar faltas resueltas
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Information Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Cómo funciona la detección automática
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Auto-falta por entrada:</strong> Si no hay registro de entrada 1 hora después del horario, se marca falta automáticamente</li>
                <li><strong>Comida:</strong> El tiempo de comida no debe exceder 1 hora entre salida y regreso</li>
                <li><strong>Correcciones:</strong> Puedes resolver faltas cuando alguien olvidó registrar o hay una justificación válida</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnosis Panel - Mostrar solo cuando no hay faltas */}
      {showDiagnosis && diagnosis && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <InformationCircleIcon className="h-6 w-6 text-gray-500" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                Diagnóstico del Sistema de Detección
              </h3>

              {/* Estado del Sistema */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Usuarios Activos</div>
                  <div className={`text-lg font-semibold ${diagnosis.usersWithProductType > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {diagnosis.usersWithProductType} / {diagnosis.activeUsersCount}
                  </div>
                  <div className="text-xs text-gray-500">con producto asignado</div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Horarios Configurados</div>
                  <div className={`text-lg font-semibold ${diagnosis.hasSchedules ? 'text-green-600' : 'text-red-600'}`}>
                    {diagnosis.schedulesConfigured.length}
                  </div>
                  <div className="text-xs text-gray-500">{diagnosis.schedulesConfigured.join(', ') || 'ninguno'}</div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Check-ins Hoy</div>
                  <div className={`text-lg font-semibold ${diagnosis.hasTodayCheckIns ? 'text-green-600' : 'text-yellow-600'}`}>
                    {diagnosis.todayCheckInsCount}
                  </div>
                  <div className="text-xs text-gray-500">registros</div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Día Laboral</div>
                  <div className={`text-lg font-semibold ${diagnosis.isWorkDay ? 'text-green-600' : 'text-gray-600'}`}>
                    {diagnosis.isWorkDay ? 'Sí' : 'No'}
                  </div>
                  <div className="text-xs text-gray-500">Hora: {diagnosis.currentTime}</div>
                </div>
              </div>

              {/* Advertencias */}
              {diagnosis.warnings && diagnosis.warnings.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">⚠️ Advertencias</h4>
                  <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                    {diagnosis.warnings.map((warning: string, index: number) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sugerencias */}
              {diagnosis.suggestions && diagnosis.suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Sugerencias</h4>
                  <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                    {diagnosis.suggestions.map((suggestion: string, index: number) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mensaje cuando todo está OK */}
              {(!diagnosis.warnings || diagnosis.warnings.length === 0) &&
               (!diagnosis.suggestions || diagnosis.suggestions.length === 0) && (
                <div className="text-sm text-green-700">
                  ✅ El sistema está configurado correctamente. Las faltas se detectarán automáticamente cuando corresponda.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Lista de Faltas
            {filteredIssues.length > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({filteredIssues.length}{issues.length !== filteredIssues.length ? ` de ${issues.length}` : ''} resultados)
              </span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <AttendanceIssuesTable
            issues={filteredIssues}
            onResolve={handleResolve}
          />
        )}
      </div>
    </div>
  );
}
