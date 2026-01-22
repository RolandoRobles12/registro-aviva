// src/pages/admin/CheckIns.tsx - Versión corregida con paginación funcional

import React, { useState, useEffect, useCallback } from 'react';
import { FirestoreService } from '../../services/firestore';
import { HubService } from '../../services/hubs';
import { CheckInFilters } from '../../components/admin/CheckInFilters';
import { CheckInTable } from '../../components/admin/CheckInTable';
import { CheckInStats } from '../../components/admin/CheckInStats';
import { ExportButton } from '../../components/admin/ExportButton';
import { LoadingSpinner, Alert } from '../../components/ui';
import { CheckIn, CheckInFilters as Filters, Kiosk, Hub } from '../../types';
import { generateReportData } from '../../utils/export';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

export default function AdminCheckIns() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [hasNext, setHasNext] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hubFilterWarning, setHubFilterWarning] = useState<string | null>(null);

  // ✅ Cargar datos iniciales (kiosks y hubs)
  useEffect(() => {
    loadInitialData();
  }, []);

  // ✅ Recargar cuando cambien los filtros - sin delay para mejor respuesta
  useEffect(() => {
    // Cargar inmediatamente con reset de paginación cuando cambien los filtros
    const loadData = async () => {
      try {
        setLoading(true);
        setCheckIns([]);
        setLastDoc(undefined);
        setCurrentPage(1);
        setTotalLoaded(0);
        setHasNext(false);
        setError(null);
        setHubFilterWarning(null);

        console.log('🔍 Loading check-ins with filters:', filters);

        // Validar filtro de hub si está activo
        if (filters.hubId && kiosks.length > 0) {
          const kiosksWithHub = kiosks.filter(k => k.hubId);
          const kiosksWithoutHub = kiosks.filter(k => !k.hubId);
          const kiosksWithTargetHub = kiosks.filter(k => k.hubId === filters.hubId);

          console.log(`🏢 Hub filter validation:`);
          console.log(`  - Total kiosks: ${kiosks.length}`);
          console.log(`  - Kiosks with Hub: ${kiosksWithHub.length}`);
          console.log(`  - Kiosks without Hub: ${kiosksWithoutHub.length}`);
          console.log(`  - Kiosks with target Hub '${filters.hubId}': ${kiosksWithTargetHub.length}`);

          if (kiosksWithTargetHub.length === 0) {
            setHubFilterWarning(
              `⚠️ No se encontraron kioscos asignados al Hub seleccionado. ` +
              `${kiosksWithoutHub.length} de ${kiosks.length} kioscos no tienen Hub asignado. ` +
              `El filtro puede no devolver resultados.`
            );
          } else if (kiosksWithoutHub.length > kiosks.length * 0.3) {
            setHubFilterWarning(
              `⚠️ ${kiosksWithoutHub.length} de ${kiosks.length} kioscos no tienen Hub asignado. ` +
              `Los check-ins de estos kioscos no aparecerán en los resultados del filtro de Hub.`
            );
          }
        }

        const result = await FirestoreService.getCheckIns(filters, 1, 50, undefined);

        console.log('📊 Check-ins loaded:', {
          newData: result.data.length,
          hasNext: result.hasNext,
          page: result.page
        });

        setCheckIns(result.data);
        setTotalLoaded(result.data.length);
        setHasNext(result.hasNext);
        setLastDoc(result.lastDoc);
      } catch (error: any) {
        console.error('❌ Error loading check-ins:', error);

        let errorMessage = 'Error cargando registros de check-in';

        if (error.message.includes('index')) {
          errorMessage = 'Error de índice en la base de datos. Los filtros combinados pueden no estar disponibles.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Sin permisos para acceder a los datos.';
        } else if (error.message.includes('quota')) {
          errorMessage = 'Cuota de base de datos excedida. Intenta con filtros más específicos.';
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters, kiosks]);

  const loadInitialData = async () => {
    try {
      const [kiosksList, hubsList] = await Promise.all([
        FirestoreService.getActiveKiosks(),
        HubService.getAllHubs(true) // Solo hubs activos
      ]);

      console.log('📍 Loaded kiosks:', kiosksList.length);
      console.log('🏢 Loaded hubs:', hubsList.length);

      // Debug: Mostrar kiosks y sus hubIds
      const kiosksWithHub = kiosksList.filter(k => k.hubId);
      const kiosksWithoutHub = kiosksList.filter(k => !k.hubId);
      console.log(`  - Kiosks con Hub asignado: ${kiosksWithHub.length}`);
      console.log(`  - Kiosks sin Hub: ${kiosksWithoutHub.length}`);

      if (kiosksWithHub.length > 0) {
        console.log('  - Ejemplo de kiosk con hub:', kiosksWithHub[0].id, '→ hubId:', kiosksWithHub[0].hubId);
      }

      setKiosks(kiosksList);
      setHubs(hubsList);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Error cargando datos iniciales');
    }
  };

  // ✅ Función para cargar más check-ins (paginación)
  const loadCheckIns = useCallback(async (resetPagination = false) => {
    try {
      if (resetPagination) {
        setLoading(true);
        setCheckIns([]);
        setLastDoc(undefined);
        setCurrentPage(1);
        setTotalLoaded(0);
      } else {
        setLoadingMore(true);
      }

      setError(null);

      console.log('🔍 Loading check-ins...', {
        filters,
        resetPagination,
        currentPage: resetPagination ? 1 : currentPage + 1
      });

      const result = await FirestoreService.getCheckIns(
        filters,
        resetPagination ? 1 : currentPage + 1,
        50, // Page size
        resetPagination ? undefined : lastDoc
      );

      console.log('📊 Check-ins loaded:', {
        newData: result.data.length,
        hasNext: result.hasNext,
        page: result.page
      });

      if (resetPagination) {
        setCheckIns(result.data);
        setTotalLoaded(result.data.length);
      } else {
        setCheckIns(prev => [...prev, ...result.data]);
        setTotalLoaded(prev => prev + result.data.length);
      }

      setHasNext(result.hasNext);
      setLastDoc(result.lastDoc);

      if (!resetPagination) {
        setCurrentPage(prev => prev + 1);
      }

    } catch (error: any) {
      console.error('❌ Error loading check-ins:', error);

      // ✅ Mensajes de error más específicos
      let errorMessage = 'Error cargando registros de check-in';

      if (error.message.includes('index')) {
        errorMessage = 'Error de índice en la base de datos. Los filtros combinados pueden no estar disponibles.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Sin permisos para acceder a los datos.';
      } else if (error.message.includes('quota')) {
        errorMessage = 'Cuota de base de datos excedida. Intenta con filtros más específicos.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, currentPage, lastDoc]);

  const handleFiltersChange = (newFilters: Filters) => {
    console.log('🔄 Filters changed:', newFilters);
    setFilters(newFilters);
  };

  const handleLoadMore = () => {
    if (hasNext && !loadingMore) {
      loadCheckIns(false);
    }
  };

  // ✅ Función de exportación corregida - solo retorna los datos sin metadata
  const handleExport = useCallback(() => {
    try {
      if (checkIns.length === 0) {
        alert('No hay datos para exportar. Aplica filtros para obtener registros.');
        return [];
      }

      console.log('📤 Exporting', checkIns.length, 'check-ins');
      const reportData = generateReportData(checkIns, filters);

      console.log('✅ Generated', reportData.length, 'rows for export');
      return reportData;
    } catch (error) {
      console.error('Error preparing export:', error);
      alert('Error preparando los datos para exportar');
      return [];
    }
  }, [checkIns, filters]);

  // ✅ Función para reintentar carga
  const handleRetry = () => {
    setError(null);
    loadCheckIns(true);
  };

  return (
    <div className="space-y-6">
      {/* Header mejorado */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestión de Check-ins
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Administra y revisa los registros de asistencia del personal de campo.
            </p>
            {totalLoaded > 0 && (
              <div className="mt-2 text-sm text-gray-500">
                {totalLoaded} registros cargados
                {hasNext && ' (hay más disponibles)'}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {/* ✅ Botón de recarga */}
            <button
              onClick={handleRetry}
              disabled={loading}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm"
            >
              {loading ? 'Cargando...' : '🔄 Recargar'}
            </button>
            
            <ExportButton
              onExport={handleExport}
              filename="checkins-report"
              disabled={checkIns.length === 0 || loading}
            />
          </div>
        </div>
      </div>

      {/* Error Alert con opción de reintentar */}
      {error && (
        <Alert
          type="error"
          title="Error cargando datos"
          message={error}
          dismissible
          onDismiss={() => setError(null)}
        >
          <div className="mt-3">
            <button
              onClick={handleRetry}
              className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
            >
              Reintentar
            </button>
          </div>
        </Alert>
      )}

      {/* Hub Filter Warning */}
      {hubFilterWarning && (
        <Alert
          type="warning"
          title="Advertencia de filtro de Hub"
          message={hubFilterWarning}
          dismissible
          onDismiss={() => setHubFilterWarning(null)}
        />
      )}

      {/* Filters */}
      <CheckInFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        kiosks={kiosks}
        hubs={hubs}
      />

      {/* Stats - Solo mostrar si hay datos */}
      {checkIns.length > 0 && (
        <CheckInStats checkIns={checkIns} />
      )}

      {/* ✅ Indicador de carga inicial */}
      {loading && checkIns.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">
              Cargando registros de check-in...
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {Object.keys(filters).length > 0 
                ? 'Aplicando filtros...' 
                : 'Esto puede tomar unos segundos'
              }
            </p>
          </div>
        </div>
      ) : (
        /* Table with improved loading states */
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Registros de Check-in
                {totalLoaded > 0 && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({totalLoaded} {totalLoaded === 1 ? 'resultado' : 'resultados'})
                  </span>
                )}
              </h3>
              
              {/* ✅ Indicadores de estado */}
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {loadingMore && (
                  <div className="flex items-center space-x-1">
                    <LoadingSpinner size="sm" />
                    <span>Cargando más...</span>
                  </div>
                )}
                {hasNext && !loadingMore && (
                  <span className="text-blue-600">Hay más resultados disponibles</span>
                )}
                {!hasNext && totalLoaded > 50 && (
                  <span className="text-green-600">Todos los resultados cargados</span>
                )}
              </div>
            </div>
          </div>

          <CheckInTable
            checkIns={checkIns}
            loading={loadingMore}
            hasNext={hasNext}
            onLoadMore={handleLoadMore}
          />

          {/* ✅ Estado vacío mejorado */}
          {!loading && checkIns.length === 0 && !error && (
            <div className="p-12 text-center">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No se encontraron registros
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {Object.keys(filters).length > 0 
                  ? 'No hay check-ins que coincidan con los filtros aplicados. Prueba con criterios diferentes.'
                  : 'No hay registros de check-in en el sistema.'
                }
              </p>
              {Object.keys(filters).length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setFilters({})}
                    className="text-primary-600 hover:text-primary-500 text-sm font-medium"
                  >
                    Limpiar todos los filtros
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ✅ Debug info (solo en desarrollo) */}
      {import.meta.env.DEV && (
        <div className="bg-gray-100 rounded-lg p-4 text-xs">
          <details>
            <summary className="cursor-pointer font-medium">Debug Info</summary>
            <div className="mt-2 space-y-1">
              <div>Total loaded: {totalLoaded}</div>
              <div>Has next: {hasNext.toString()}</div>
              <div>Current page: {currentPage}</div>
              <div>Loading: {loading.toString()}</div>
              <div>Loading more: {loadingMore.toString()}</div>
              <div>Filters: {JSON.stringify(filters, null, 2)}</div>
              <div>Last doc ID: {lastDoc?.id || 'none'}</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}