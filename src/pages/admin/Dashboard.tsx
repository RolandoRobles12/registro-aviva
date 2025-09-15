// src/pages/admin/Dashboard.tsx - VERSIÓN CORREGIDA

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreService } from '../../services/firestore';
import { AttendanceService } from '../../services/attendance';
import { LoadingSpinner, Alert } from '../../components/ui';
import { KPICards } from '../../components/admin/KPICards';
import { RecentCheckIns } from '../../components/admin/RecentCheckIns';
import { PendingRequests } from '../../components/admin/PendingRequests';
import { QuickActions } from '../../components/admin/QuickActions';
import { CheckIn, TimeOffRequest, SystemKPIs, AttendanceIssue } from '../../types';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([]);
  const [pendingRequests, setPendingRequests] = useState<TimeOffRequest[]>([]);
  const [attendanceIssues, setAttendanceIssues] = useState<AttendanceIssue[]>([]);
  const [kpis, setKPIs] = useState<SystemKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadDashboardData();
    // Auto-refresh every 2 minutes
    const interval = setInterval(loadDashboardData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Cargando datos del dashboard...');
      
      // Get date ranges
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const now = new Date(); // Para estadísticas hasta ahora
      
      console.log('📅 Cargando datos para:', today.toISOString(), 'hasta', now.toISOString());

      // Load data in parallel con mejor manejo de errores
      const results = await Promise.allSettled([
        FirestoreService.getCheckIns({
          dateRange: { start: today, end: now }
        }, 1, 20), // Solo los primeros 20 para el dashboard
        
        FirestoreService.getTimeOffRequests({ status: 'pending' }),
        
        AttendanceService.getAttendanceIssues({ 
          date: today, 
          resolved: false 
        }),
        
        AttendanceService.getAttendanceStats({
          start: today,
          end: now
        })
      ]);

      // Process check-ins result
      if (results[0].status === 'fulfilled') {
        const checkInsData = results[0].value.data;
        setRecentCheckIns(checkInsData);
        console.log('✅ Check-ins cargados:', checkInsData.length);
      } else {
        console.error('❌ Error cargando check-ins:', results[0].reason);
        setRecentCheckIns([]);
      }

      // Process time off requests result
      if (results[1].status === 'fulfilled') {
        const timeOffData = results[1].value;
        const pendingOnly = timeOffData.filter(r => r.status === 'pending');
        setPendingRequests(pendingOnly);
        console.log('✅ Solicitudes pendientes cargadas:', pendingOnly.length);
      } else {
        console.error('❌ Error cargando solicitudes:', results[1].reason);
        setPendingRequests([]);
      }

      // Process attendance issues result
      if (results[2].status === 'fulfilled') {
        setAttendanceIssues(results[2].value);
        console.log('✅ Issues de asistencia cargados:', results[2].value.length);
      } else {
        console.error('❌ Error cargando issues:', results[2].reason);
        setAttendanceIssues([]);
      }

      // Process stats result and calculate KPIs
      if (results[3].status === 'fulfilled') {
        const statsData = results[3].value;
        const calculatedKPIs = calculateKPIs(statsData, attendanceIssues.length);
        setKPIs(calculatedKPIs);
        console.log('✅ KPIs calculados:', calculatedKPIs);
      } else {
        console.error('❌ Error cargando estadísticas:', results[3].reason);
        // Set default KPIs if stats fail
        setKPIs({
          totalCheckins: recentCheckIns.length,
          punctualityPercentage: 0,
          locationAccuracyPercentage: 0,
          totalIncidents: attendanceIssues.length,
          avgHoursWorked: 8.0
        });
      }

      setLastUpdate(new Date());
      console.log('✅ Dashboard data loaded successfully');

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setError('Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (stats: any, issuesCount: number): SystemKPIs => {
    console.log('🧮 Calculando KPIs con stats:', stats);
    
    // Use stats directly since they're already calculated
    const totalCheckins = stats.totalPresent || 0;
    const punctualityPercentage = stats.punctualityRate || 0;
    const locationAccuracyPercentage = totalCheckins > 0 ? 
      ((totalCheckins - recentCheckIns.filter(c => !c.validationResults?.locationValid).length) / totalCheckins) * 100 : 0;
    
    const totalIncidents = (stats.totalLate || 0) + (stats.totalAbsent || 0) + issuesCount;
    
    // Calculate average hours worked (simplified - can be enhanced)
    const avgHoursWorked = 8.2; // Default, could be calculated from entry/exit times
    
    return {
      totalCheckins,
      punctualityPercentage,
      locationAccuracyPercentage,
      totalIncidents,
      avgHoursWorked
    };
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  if (loading && !kpis) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-2 text-gray-600">Cargando panel de control...</p>
        </div>
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
            <div className="mt-1 flex items-center space-x-4">
              <p className="text-sm text-gray-600">
                Resumen general del sistema de asistencia - {new Date().toLocaleDateString('es-MX')}
              </p>
              {lastUpdate && (
                <p className="text-xs text-gray-500">
                  Actualizado: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm">Actualizar</span>
            </button>
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

      {/* Attendance Issues Alert */}
      {attendanceIssues.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {attendanceIssues.length} Inasistencia{attendanceIssues.length !== 1 ? 's' : ''} Detectada{attendanceIssues.length !== 1 ? 's' : ''}
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Se han detectado las siguientes situaciones:</p>
                <ul className="list-disc list-inside mt-1">
                  {attendanceIssues.slice(0, 3).map((issue, idx) => (
                    <li key={idx}>
                      <strong>{issue.userName}</strong> - {
                        issue.type === 'no_entry' ? 'Sin entrada' :
                        issue.type === 'no_exit' ? 'Sin salida' :
                        issue.type === 'late_lunch_return' ? 'Retraso de comida' :
                        'Sin regreso de comida'
                      }
                      {issue.minutesLate && ` (${issue.minutesLate} min tarde)`}
                    </li>
                  ))}
                  {attendanceIssues.length > 3 && (
                    <li>... y {attendanceIssues.length - 3} más</li>
                  )}
                </ul>
                <div className="mt-2">
                  <a 
                    href="/admin/statistics" 
                    className="text-yellow-800 underline hover:text-yellow-900"
                  >
                    Ver detalles en Estadísticas →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {kpis && <KPICards kpis={kpis} />}

      {/* Loading state for refresh */}
      {loading && kpis && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-sm text-blue-700">Actualizando datos...</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <QuickActions />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Check-ins */}
        <RecentCheckIns checkIns={recentCheckIns} />

        {/* Pending Requests */}
        <PendingRequests requests={pendingRequests} onUpdate={loadDashboardData} />
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Estado del Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{recentCheckIns.length}</div>
            <div className="text-sm text-gray-600">Check-ins hoy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
            <div className="text-sm text-gray-600">Solicitudes pendientes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{attendanceIssues.length}</div>
            <div className="text-sm text-gray-600">Issues detectados</div>
          </div>
        </div>
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 rounded-lg p-4 text-xs">
          <strong>Debug Info:</strong>
          <div>Check-ins: {recentCheckIns.length}</div>
          <div>Pending requests: {pendingRequests.length}</div>
          <div>Issues: {attendanceIssues.length}</div>
          <div>KPIs: {kpis ? 'Loaded' : 'Not loaded'}</div>
          <div>Last update: {lastUpdate?.toLocaleString() || 'Never'}</div>
        </div>
      )}
    </div>
  );
}