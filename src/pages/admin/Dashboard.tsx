// src/pages/admin/Dashboard.tsx - COMPLETO CON CORRECCIONES
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
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([]);
  const [pendingRequests, setPendingRequests] = useState<TimeOffRequest[]>([]);
  const [attendanceIssues, setAttendanceIssues] = useState<AttendanceIssue[]>([]);
  const [kpis, setKPIs] = useState<SystemKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    // Reload data every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get date range for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Load all data in parallel
      const [checkInsResult, timeOffResult, issuesResult, statsResult] = await Promise.allSettled([
        FirestoreService.getCheckIns({
          dateRange: {
            start: today,
            end: tomorrow
          }
        }),
        FirestoreService.getTimeOffRequests({ status: 'pending' }),
        AttendanceService.getAttendanceIssues({ 
          date: today, 
          resolved: false 
        }),
        AttendanceService.getAttendanceStats({
          start: today,
          end: tomorrow
        })
      ]);

      // Handle check-ins
      if (checkInsResult.status === 'fulfilled') {
        setRecentCheckIns(checkInsResult.value.data);
        const calculatedKPIs = calculateKPIs(checkInsResult.value.data, statsResult);
        setKPIs(calculatedKPIs);
      } else {
        console.error('Error loading check-ins:', checkInsResult.reason);
        setRecentCheckIns([]);
      }

      // Handle time off requests
      if (timeOffResult.status === 'fulfilled' && timeOffResult.value) {
        // Filter only pending requests
        const pendingOnly = timeOffResult.value.filter(r => r.status === 'pending');
        setPendingRequests(pendingOnly);
        console.log('Pending requests loaded:', pendingOnly.length);
      } else {
        console.error('Error loading time off requests');
        setPendingRequests([]);
      }

      // Handle attendance issues
      if (issuesResult.status === 'fulfilled') {
        setAttendanceIssues(issuesResult.value);
      } else {
        console.error('Error loading attendance issues');
        setAttendanceIssues([]);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (checkIns: CheckIn[], statsResult: any): SystemKPIs => {
    const totalCheckins = checkIns.length;
    
    if (totalCheckins === 0 && statsResult?.status === 'fulfilled') {
      // Use stats from AttendanceService
      const stats = statsResult.value;
      return {
        totalCheckins: stats.totalPresent,
        punctualityPercentage: stats.punctualityRate,
        locationAccuracyPercentage: 100, // Default if no data
        totalIncidents: stats.totalAbsent + stats.totalLate,
        avgHoursWorked: 8.0 // Calculate from actual data
      };
    }

    const onTimeCount = checkIns.filter(c => c.status === 'a_tiempo').length;
    const validLocationCount = checkIns.filter(c => c.validationResults?.locationValid).length;
    const incidentCount = checkIns.filter(c => 
      c.status === 'retrasado' || c.status === 'ubicacion_invalida'
    ).length;

    return {
      totalCheckins,
      punctualityPercentage: totalCheckins > 0 ? (onTimeCount / totalCheckins) * 100 : 0,
      locationAccuracyPercentage: totalCheckins > 0 ? (validLocationCount / totalCheckins) * 100 : 0,
      totalIncidents: incidentCount + attendanceIssues.length,
      avgHoursWorked: 8.2 // TODO: Calculate from actual check-ins
    };
  };

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
              Resumen general del sistema de asistencia - {new Date().toLocaleDateString('es-MX')}
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

      {/* Attendance Issues Alert */}
      {attendanceIssues.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Inasistencias Detectadas
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Se han detectado {attendanceIssues.length} inasistencias hoy:</p>
                <ul className="list-disc list-inside mt-1">
                  {attendanceIssues.slice(0, 3).map((issue, idx) => (
                    <li key={idx}>
                      {issue.userName} - {
                        issue.type === 'no_entry' ? 'Sin entrada' :
                        issue.type === 'no_exit' ? 'Sin salida' :
                        'Sin regreso de comida'
                      } (esperado: {issue.expectedTime})
                    </li>
                  ))}
                  {attendanceIssues.length > 3 && (
                    <li>... y {attendanceIssues.length - 3} más</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
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
    </div>
  );
}