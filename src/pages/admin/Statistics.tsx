// src/pages/admin/Statistics.tsx - COMPLETO CON DATOS REALES
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
  ExclamationTriangleIcon
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
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchStatistics();
  }, [selectedPeriod]);

  const fetchStatistics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Calculate date range based on selected period
      const end = new Date();
      const start = new Date();
      
      switch (selectedPeriod) {
        case 'week':
          start.setDate(start.getDate() - 7);
          break;
        case 'month':
          start.setMonth(start.getMonth() - 1);
          break;
        case 'year':
          start.setFullYear(start.getFullYear() - 1);
          break;
      }

      // Get real statistics
      const [attendanceStats, deptStats, trends] = await Promise.all([
        AttendanceService.getAttendanceStats({ start, end }),
        AttendanceService.getDepartmentStats({ start, end }),
        getMonthlyTrend()
      ]);
      
      setStats(attendanceStats);
      setDepartmentStats(deptStats);
      setMonthlyTrend(trends);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError('Error cargando estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyTrend = async (): Promise<MonthlyTrend[]> => {
    const trends: MonthlyTrend[] = [];
    const now = new Date();
    
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
    
    return trends;
  };

  // Simple bar chart component
  const BarChart = ({ data }: { data: MonthlyTrend[] }) => {
    const maxValue = Math.max(...data.map(d => d.present + d.absent + d.late)) || 1;
    
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-16 text-sm font-medium text-gray-700 capitalize">{item.month}</div>
            <div className="flex-1 flex">
              <div 
                className="bg-green-500 h-6 flex items-center justify-center text-white text-xs"
                style={{ width: `${(item.present / maxValue) * 100}%`, minWidth: item.present > 0 ? '30px' : '0px' }}
              >
                {item.present > 0 && item.present}
              </div>
              <div 
                className="bg-red-500 h-6 flex items-center justify-center text-white text-xs"
                style={{ width: `${(item.absent / maxValue) * 100}%`, minWidth: item.absent > 0 ? '30px' : '0px' }}
              >
                {item.absent > 0 && item.absent}
              </div>
              <div 
                className="bg-yellow-500 h-6 flex items-center justify-center text-white text-xs"
                style={{ width: `${(item.late / maxValue) * 100}%`, minWidth: item.late > 0 ? '30px' : '0px' }}
              >
                {item.late > 0 && item.late}
              </div>
            </div>
          </div>
        ))}
        <div className="flex items-center space-x-4 text-xs mt-4">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500"></div>
            <span>Presente</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500"></div>
            <span>Ausente</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500"></div>
            <span>Tarde</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert type="error" message={error} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <Alert type="warning" message="No hay datos disponibles" />
      </div>
    );
  }

  const attendanceRate = formatPercentage(stats.attendanceRate);
  const punctualityRate = formatPercentage(stats.punctualityRate);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Estadísticas de Asistencia</h1>
        <div className="flex space-x-2">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'year')}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="week">Esta Semana</option>
            <option value="month">Este Mes</option>
            <option value="year">Este Año</option>
          </select>
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

      {/* Monthly Trends */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Tendencia Mensual</h2>
          <ChartBarIcon className="h-6 w-6 text-gray-400" />
        </div>
        <BarChart data={monthlyTrend} />
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
                      {dept.department}
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
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${dept.attendance}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">{formatPercentage(dept.attendance)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full"
                            style={{ width: `${dept.punctuality}%` }}
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
              <span className="text-sm text-gray-600">Período seleccionado:</span>
              <span className="text-sm font-semibold text-gray-900 capitalize">{selectedPeriod}</span>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStatistics;