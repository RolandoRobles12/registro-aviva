import React, { useState, useEffect } from 'react';
import { FirestoreService } from '../../services/firestore';
import { CheckInFilters } from '../../components/admin/CheckInFilters';
import { CheckInTable } from '../../components/admin/CheckInTable';
import { CheckInStats } from '../../components/admin/CheckInStats';
import { ExportButton } from '../../components/admin/ExportButton';
import { LoadingSpinner, Alert } from '../../components/ui';
import { CheckIn, CheckInFilters as Filters, Kiosk } from '../../types';
import { generateReportData } from '../../utils/export';

export default function AdminCheckIns() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [hasNext, setHasNext] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadCheckIns();
  }, [filters]);

  const loadInitialData = async () => {
    try {
      const kiosksList = await FirestoreService.getActiveKiosks();
      setKiosks(kiosksList);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Error cargando datos iniciales');
    }
  };

  const loadCheckIns = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const result = await FirestoreService.getCheckIns(filters, page, 50);
      
      if (page === 1) {
        setCheckIns(result.data);
      } else {
        setCheckIns(prev => [...prev, ...result.data]);
      }
      
      setHasNext(result.hasNext);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading check-ins:', error);
      setError('Error cargando registros de check-in');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleLoadMore = () => {
    if (hasNext && !loading) {
      loadCheckIns(currentPage + 1);
    }
  };

  const handleExport = () => {
    const reportData = generateReportData(checkIns, filters);
    return reportData;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestión de Check-ins
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Administra y revisa los registros de asistencia del personal de campo.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <ExportButton
              onExport={handleExport}
              filename="checkins-report"
              disabled={checkIns.length === 0}
            />
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
      <CheckInFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        kiosks={kiosks}
      />

      {/* Stats */}
      {checkIns.length > 0 && (
        <CheckInStats checkIns={checkIns} />
      )}

      {/* Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Registros de Check-in
            {checkIns.length > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({checkIns.length} resultados)
              </span>
            )}
          </h3>
        </div>

        {loading && currentPage === 1 ? (
          <div className="p-6 text-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <CheckInTable
            checkIns={checkIns}
            loading={loading}
            hasNext={hasNext}
            onLoadMore={handleLoadMore}
          />
        )}
      </div>
    </div>
  );
}