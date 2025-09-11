import React, { useState, useEffect } from 'react';

interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  avgHoursPerDay: number;
  monthlyAttendance: Array<{
    month: string;
    present: number;
    absent: number;
    late: number;
  }>;
  departmentStats: Array<{
    department: string;
    attendance: number;
    employees: number;
  }>;
}

const AdminStatistics: React.FC = () => {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchStatistics();
  }, [selectedPeriod]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      // Simulated data - replace with actual API call
      const mockStats: AttendanceStats = {
        totalEmployees: 150,
        presentToday: 138,
        absentToday: 8,
        lateToday: 4,
        avgHoursPerDay: 8.2,
        monthlyAttendance: [
          { month: 'Enero', present: 142, absent: 5, late: 3 },
          { month: 'Febrero', present: 145, absent: 3, late: 2 },
          { month: 'Marzo', present: 140, absent: 7, late: 3 },
          { month: 'Abril', present: 138, absent: 8, late: 4 },
          { month: 'Mayo', present: 144, absent: 4, late: 2 },
          { month: 'Junio', present: 138, absent: 8, late: 4 },
        ],
        departmentStats: [
          { department: 'Ventas', attendance: 95, employees: 25 },
          { department: 'IT', attendance: 98, employees: 15 },
          { department: 'RRHH', attendance: 92, employees: 8 },
          { department: 'Contabilidad', attendance: 97, employees: 12 },
          { department: 'Marketing', attendance: 94, employees: 10 },
          { department: 'Operaciones', attendance: 89, employees: 30 },
        ]
      };
      
      setTimeout(() => {
        setStats(mockStats);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Error al cargar las estadísticas
        </div>
      </div>
    );
  }

  const attendanceRate = ((stats.presentToday / stats.totalEmployees) * 100).toFixed(1);

  // Simple bar chart component using CSS
  const BarChart = ({ data }: { data: Array<{ month: string; present: number; absent: number; late: number }> }) => {
    const maxValue = Math.max(...data.map(d => d.present + d.absent + d.late));
    
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-16 text-sm font-medium text-gray-700">{item.month}</div>
            <div className="flex-1 flex">
              <div 
                className="bg-green-500 h-6 flex items-center justify-center text-white text-xs"
                style={{ width: `${(item.present / maxValue) * 100}%`, minWidth: '20px' }}
              >
                {item.present}
              </div>
              <div 
                className="bg-red-500 h-6 flex items-center justify-center text-white text-xs"
                style={{ width: `${(item.absent / maxValue) * 100}%`, minWidth: item.absent > 0 ? '20px' : '0px' }}
              >
                {item.absent > 0 ? item.absent : ''}
              </div>
              <div 
                className="bg-yellow-500 h-6 flex items-center justify-center text-white text-xs"
                style={{ width: `${(item.late / maxValue) * 100}%`, minWidth: item.late > 0 ? '20px' : '0px' }}
              >
                {item.late > 0 ? item.late : ''}
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Estadísticas de Asistencia</h1>
        <div className="flex space-x-2">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'year')}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <p className="text-sm font-medium text-gray-600">Total Empleados</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalEmployees}</p>
              <p className="text-xs text-gray-500">Empleados activos</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Asistencia Hoy</p>
              <p className="text-3xl font-bold text-green-600">{stats.presentToday}</p>
              <p className="text-xs text-gray-500">{attendanceRate}% de asistencia</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ausencias Hoy</p>
              <p className="text-3xl font-bold text-red-600">{stats.absentToday}</p>
              <p className="text-xs text-gray-500">{stats.lateToday} llegadas tarde</p>
            </div>
            <div className="text-4xl">❌</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Promedio Horas/Día</p>
              <p className="text-3xl font-bold text-gray-900">{stats.avgHoursPerDay}</p>
              <p className="text-xs text-gray-500">Horas trabajadas</p>
            </div>
            <div className="text-4xl">⏰</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Attendance Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Asistencia Mensual</h3>
          <BarChart data={stats.monthlyAttendance} />
        </div>

        {/* Department Statistics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Asistencia por Departamento</h3>
          <div className="space-y-3">
            {stats.departmentStats.map((dept, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900">{dept.department}</span>
                    <span className="text-sm font-bold text-gray-700">{dept.attendance}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        dept.attendance >= 95 ? 'bg-green-500' : 
                        dept.attendance >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${dept.attendance}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{dept.employees} empleados</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Statistics Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Resumen por Departamento</h3>
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
                  % Asistencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.departmentStats.map((dept, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {dept.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dept.employees}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <span className="mr-2">{dept.attendance}%</span>
                      <span className="text-green-500">↗ +2.3%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      dept.attendance >= 95 
                        ? 'bg-green-100 text-green-800' 
                        : dept.attendance >= 90 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {dept.attendance >= 95 ? 'Excelente' : dept.attendance >= 90 ? 'Bueno' : 'Necesita atención'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-blue-900 mb-2">Tendencia General</h4>
          <p className="text-sm text-blue-700">
            La asistencia general se mantiene estable con un promedio del {attendanceRate}% 
            durante el período seleccionado.
          </p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-green-900 mb-2">Mejor Departamento</h4>
          <p className="text-sm text-green-700">
            IT lidera con 98% de asistencia, seguido por Contabilidad con 97%.
          </p>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-yellow-900 mb-2">Área de Mejora</h4>
          <p className="text-sm text-yellow-700">
            Operaciones tiene el menor porcentaje de asistencia (89%) y requiere atención.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminStatistics;