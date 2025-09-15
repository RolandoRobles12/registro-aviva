// src/pages/admin/Statistics.tsx - VERSIÓN CORREGIDA

import React, { useState, useEffect } from 'react';
import { AttendanceService } from '../../services/attendance';
import { FirestoreService } from '../../services/firestore';
import { LoadingSpinner, Alert } from '../../components/ui';
import { PRODUCT_TYPES } from '../../utils/constants';
import { formatPercentage } from '../../utils/formatters';
import { 
  ChartBarIcon, 
  UsersIcon, 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface DepartmentStat {
  department: string;
  employees: number;
  present: number;
  absent: number;
  attendance: number;
  punctuality: number;
}

interface MonthlyTrend {
  month: string;
  present: number;
  absent: number;
  late: number;
}

const AdminStatistics: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    fetchStatistics();
    // Auto-refresh cada 5 minutos
    const interval = setInterval(fetchStatistics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const fetchStatistics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Cargando estadísticas para período:', selectedPeriod);
      
      // Calcular rango de fechas basado en el período seleccionado
      const { start, end } = getDateRange(selectedPeriod);
      
      console.log('📅 Rango de fechas:', start.toISOString(), 'a', end.toISOString());

      // Cargar estadísticas en paralelo
      const [attendanceStats, deptStats, trends] = await Promise.all([
        AttendanceService.getAttendanceStats({ start, end }),
        AttendanceService.getDepartmentStats({ start, end }),
        getMonthlyTrend()
      ]);
      
      console.log('📊 Estadísticas obtenidas:', {
        attendance: attendanceStats,
        departments: deptStats.length,
        trends: trends.length
      });
      
      setStats(attendanceStats);
      setDepartmentStats(deptStats);
      setMonthlyTrend(trends);
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('❌ Error fetching statistics:', error);
      setError(`Error cargando estadísticas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (period: string): { start: Date; end: Date } => {
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }
    
    return { start, end };
  };

  const getMonthlyTrend = async (): Promise<MonthlyTrend[]> => {
    const trends: MonthlyTrend[] = [];
    const now = new Date();
    
    try {
      // Últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const stats = await AttendanceService.getAttendanceStats({ start, end });
        
        trends.push({
          month: start.toLocaleDateString('es-MX', { month: 'short' }),
          present: stats.totalPresent,
          absent: stats.totalAbsent,
          late: stats.totalLate
        });
      }
    } catch (error) {
      console.error('Error getting monthly trend:', error);
    }
    
    return trends;
  };

  // Simple bar chart component
  const BarChart = ({ data }: { data: MonthlyTrend[] }) => {
    const maxValue = Math.max(...data.map(d => d.present + d.absent + d.late)) || 1;
    
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-16 text-sm font-medium text-gray-700 capitalize">
              {item.month}
            </div>
            <div className="flex-1 flex bg-gray-200 rounded h-6">
              {item.present > 0 && (
                <div 
                  className="bg-green-500 h-6 flex items-center justify-center text-white text-xs rounded-l"
                  style={{ width: `${(item.present / maxValue) * 100}%`, minWidth: '20px' }}
                  title={`Presentes: ${item.present}`}
                >
                  {item.present}
                </div>
              )}
              {item.late > 0 && (
                <div 
                  className="bg-yellow-500 h-6 flex items-center justify-center text-white text-xs"
                  style={{ width: `${(item.late / maxValue) * 100}%`, minWidth: '20px' }}
                  title={`Tardíos: ${item.late}`}
                >
                  {item.late}
                </div>
              )}
              {item.absent > 0 && (
                <div 
                  className="bg-red-500 h-6 flex items-center justify-center text-white text-xs rounded-r"
                  style={{ width: `${(item.absent / maxValue) * 100}%`, minWidth: '20px' }}
                  title={`Ausentes: ${item.absent}`}
                >
                  {item.absent}
                </div>
              )}
            </div>
            <div className="text-sm text-gray-600 w-16">
              Total: {item.present + item.absent + item.late}
            </div>
          </div>
        ))}
        
        {/* Leyenda */}
        <div className="flex items-center space-x-4 text-xs mt-4">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Presente</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Tarde</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Ausente</span>
          </div>
        </div>
      </div>
    );
  };

  const handleRefresh = () => {
    fetchStatistics();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-2 text-gray-600">Cargando estadísticas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert 
          type="error" 
          message={error}
          dismissible
          onDismiss={() => setError(null)}
        />
        <div className="mt-4 text-center">
          <button
            onClick={handleRefresh}
            className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <Alert 
          type="warning" 
          message="No hay datos disponibles para el período seleccionado"
        />
        <div className="mt-4 text-center">
          <button
            onClick={handleRefresh}
            className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
          >
            Cargar Datos
          </button>
        </div>
      </div>
    );
  }

  const attendanceRate = formatPercentage(stats.attendanceRate);
  const punctualityRate = formatPercentage(stats.punctualityRate);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Estadísticas de Asistencia</h1>
          {lastUpdate && (
            <p className="text-sm text-gray-500 mt-1">
              Última actualización: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="today">Hoy</option>
            <option value="week">Última Semana</option>
            <option value="month">Último Mes</option>
            <option value="year">Último Año</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Esperado</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalExpected}</p>
              <p className="text-xs text-gray-500">Check-ins esperados</p>
            </div>
            <UsersIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Asistencia</p>
              <p className="text-3xl font-bold text-green-600">{attendanceRate}</p>
              <p className="text-xs text-gray-500">{stats.totalPresent} presentes</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ausencias</p>
              <p className="text-3xl font-bold text-red-600">{stats.totalAbsent}</p>
              <p className="text-xs text-gray-500">Total ausentes</p>
            </div>
            <XCircleIcon className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Puntualidad</p>
              <p className="text-3xl font-bold text-yellow-600">{punctualityRate}</p>
              <p className="text-xs text-gray-500">{stats.totalLate} tardanzas</p>
            </div>
            <ClockIcon className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 rounded-lg p-4 text-xs">
          <strong>Debug Info:</strong>
          <pre>{JSON.stringify(stats, null, 2)}</pre>
        </div>
      )}

      {/* Monthly Trends */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Tendencia Mensual</h2>
          <ChartBarIcon className="h-6 w-6 text-gray-400" />
        </div>
        {monthlyTrend.length > 0 ? (
          <BarChart data={monthlyTrend} />
        ) : (
          <div className="text-center py-8 text-gray-500">
            No hay datos de tendencia disponibles
          </div>
        )}
      </div>

      {/* Department Statistics Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Estadísticas por Departamento</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Departamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empleados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Presentes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ausentes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asistencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Puntualidad
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {departmentStats.length > 0 ? (
                departmentStats.map((dept, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {PRODUCT_TYPES[dept.department as keyof typeof PRODUCT_TYPES] || dept.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dept.employees}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {dept.present}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {dept.absent}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-16">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${Math.min(dept.attendance, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">{formatPercentage(dept.attendance)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-16">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full"
                            style={{ width: `${Math.min(dept.punctuality, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">{formatPercentage(dept.punctuality)}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No hay datos disponibles por departamento
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Período</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Período seleccionado:</span>
              <span className="text-sm font-semibold text-gray-900 capitalize">
                {selectedPeriod === 'today' ? 'Hoy' : 
                 selectedPeriod === 'week' ? 'Última semana' :
                 selectedPeriod === 'month' ? 'Último mes' : 'Último año'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Promedio de asistencia:</span>
              <span className="text-sm font-semibold text-gray-900">{attendanceRate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Promedio de puntualidad:</span>
              <span className="text-sm font-semibold text-gray-900">{punctualityRate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total de check-ins:</span>
              <span className="text-sm font-semibold text-gray-900">{stats.totalPresent + stats.totalLate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Efectividad general:</span>
              <span className={`text-sm font-semibold ${stats.attendanceRate >= 90 ? 'text-green-600' : stats.attendanceRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                {stats.attendanceRate >= 90 ? 'Excelente' : stats.attendanceRate >= 80 ? 'Buena' : 'Por mejorar'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas y Notificaciones</h3>
          <div className="space-y-3">
            {stats.totalAbsent > stats.totalExpected * 0.1 && (
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Alta tasa de ausencias</p>
                  <p className="text-xs text-gray-500">Las ausencias superan el 10% del esperado</p>
                </div>
              </div>
            )}
            {stats.totalLate > stats.totalPresent * 0.15 && (
              <div className="flex items-start space-x-2">
                <ClockIcon className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Puntualidad por mejorar</p>
                  <p className="text-xs text-gray-500">Las tardanzas superan el 15% de los presentes</p>
                </div>
              </div>
            )}
            {stats.attendanceRate >= 95 && (
              <div className="flex items-start space-x-2">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Excelente asistencia</p>
                  <p className="text-xs text-gray-500">La tasa de asistencia supera el 95%</p>
                </div>
              </div>
            )}
            {stats.attendanceRate >= 95 && stats.totalLate <= stats.totalPresent * 0.05 && (
              <div className="flex items-start space-x-2">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Excelente desempeño general</p>
                  <p className="text-xs text-gray-500">Alta asistencia y puntualidad</p>
                </div>
              </div>
            )}
            {/* Mostrar mensaje si no hay alertas */}
            {stats.totalAbsent <= stats.totalExpected * 0.1 && 
             stats.totalLate <= stats.totalPresent * 0.15 && 
             stats.attendanceRate < 95 && (
              <div className="flex items-start space-x-2">
                <CheckCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Sistema funcionando normalmente</p>
                  <p className="text-xs text-gray-500">No hay alertas críticas por el momento</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Quality Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Sobre los Datos
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Las estadísticas se calculan en tiempo real basándose en los check-ins registrados y las ausencias detectadas automáticamente por el sistema.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Los datos se actualizan automáticamente cada 5 minutos</li>
                <li>Las ausencias se detectan según las reglas configuradas</li>
                <li>Los departamentos se agrupan por tipo de producto</li>
                <li>Los cálculos excluyen días no laborables</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStatistics;