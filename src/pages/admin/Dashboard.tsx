import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreService } from '../../services/firestore';
import { LoadingSpinner } from '../../components/ui';
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get recent check-ins (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const [checkInsResult, timeOffRequests] = await Promise.all([
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

      setRecentCheckIns(checkInsResult.data);
      setPendingRequests(timeOffRequests);

      // Calculate KPIs
      const calculatedKPIs = calculateKPIs(checkInsResult.data);
      setKPIs(calculatedKPIs);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (checkIns: CheckIn[]): SystemKPIs => {
    const totalCheckins = checkIns.length;
    const onTimeCount = checkIns.filter(c => c.status === 'a_tiempo').length;
    const validLocationCount = checkIns.filter(c => c.validationResults.locationValid).length;
    const incidentCount = checkIns.filter(c => 
      c.status === 'retrasado' || c.status === 'ubicacion_invalida'
    ).length;

    // Calculate average hours worked (simplified - would need more complex logic)
    const avgHoursWorked = 8.2; // Placeholder

    return {
      totalCheckins,
      punctualityPercentage: totalCheckins > 0 ? (onTimeCount / totalCheckins) * 100 : 0,
      locationAccuracyPercentage: totalCheckins > 0 ? (validLocationCount / totalCheckins) * 100 : 0,
      totalIncidents: incidentCount,
      avgHoursWorked
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