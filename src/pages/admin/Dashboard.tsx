// src/pages/admin/Dashboard.tsx - Fixed version
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreService } from '../../services/firestore';
import { LoadingSpinner, Alert } from '../../components/ui';
import { KPICards } from '../../components/admin/KPICards';
import { RecentCheckIns } from '../../components/admin/RecentCheckIns';
import { PendingRequests } from '../../components/admin/PendingRequests';
import { QuickActions } from '../../components/admin/QuickActions';
import { CheckIn, TimeOffRequest, SystemKPIs } from '../../types';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([]);
  const [pendingRequests, setPendingRequests] = useState<TimeOffRequest[]>([]);
  const [kpis, setKPIs] = useState<SystemKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get recent check-ins (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Load data with error handling for each call
      const [checkInsResult, timeOffRequests] = await Promise.allSettled([
        FirestoreService.getCheckIns({
          dateRange: {
            start: yesterday,
            end: new Date()
          }
        }),
        FirestoreService.getTimeOffRequests({
          status: 'pending'
        })
      ]);

      // Handle check-ins result
      if (checkInsResult.status === 'fulfilled') {
        setRecentCheckIns(checkInsResult.value.data);
        
        // Calculate KPIs from check-ins
        const calculatedKPIs = calculateKPIs(checkInsResult.value.data);
        setKPIs(calculatedKPIs);
      } else {
        console.error('Error loading check-ins:', checkInsResult.reason);
        setRecentCheckIns([]);
        setKPIs(getDefaultKPIs());
      }

      // Handle time off requests result
      if (timeOffRequests.status === 'fulfilled') {
        setPendingRequests(timeOffRequests.value);
      } else {
        console.error('Error loading time off requests:', timeOffRequests.reason);
        setPendingRequests([]);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Error cargando datos del dashboard');
      setKPIs(getDefaultKPIs());
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (checkIns: CheckIn[]): SystemKPIs => {
    const totalCheckins = checkIns.length;
    
    if (totalCheckins === 0) {
      return getDefaultKPIs();
    }

    const onTimeCount = checkIns.filter(c => c.status === 'a_tiempo' || c.status === 'anticipado').length;
    const validLocationCount = checkIns.filter(c => c.validationResults?.locationValid).length;
    const incidentCount = checkIns.filter(c => 
      c.status === 'retrasado' || c.status === 'ubicacion_invalida'
    ).length;

    // Calculate average hours worked (simplified - would need more complex logic)
    const avgHoursWorked = 8.2; // Placeholder

    return {
      totalCheckins,
      punctualityPercentage: (onTimeCount / totalCheckins) * 100,
      locationAccuracyPercentage: (validLocationCount / totalCheckins) * 100,
      totalIncidents: incidentCount,
      avgHoursWorked
    };
  };

  const getDefaultKPIs = (): SystemKPIs => ({
    totalCheckins: 0,
    punctualityPercentage: 0,
    locationAccuracyPercentage: 0,
    totalIncidents: 0,
    avgHoursWorked: 0
  });

  if (loading) {
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
              Panel de Administración
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Resumen general del sistema de asistencia
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                Bienvenido, {user?.name}
              </div>
              <div className="text-xs text-gray-500">
                {user?.role === 'super_admin' ? 'Super Administrador' : 'Administrador'}
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

      {/* KPI Cards */}
      {kpis && <KPICards kpis={kpis} />}

      {/* Quick Actions */}
      <QuickActions />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Check-ins */}
        <RecentCheckIns checkIns={recentCheckIns} />

        {/* Pending Requests */}
        <PendingRequests requests={pendingRequests} onUpdate={loadDashboardData} />
      </div>

      {/* Debug info in development */}
      {import.meta.env.DEV && (
        <div className="bg-gray-100 rounded-lg p-4 text-xs text-gray-600">
          <strong>Debug Info:</strong>
          <br />Recent Check-ins: {recentCheckIns.length}
          <br />Pending Requests: {pendingRequests.length}
          <br />KPIs: {kpis ? 'Loaded' : 'Not loaded'}
        </div>
      )}
    </div>
  );
}