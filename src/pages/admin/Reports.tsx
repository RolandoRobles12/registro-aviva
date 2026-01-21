// src/pages/admin/Reports.tsx - Comprehensive reports page
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  DocumentTextIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui';
import ReportFiltersComponent from '../../components/admin/ReportFilters';
import {
  BarChart,
  ProgressRing,
  StatCard,
  DataTable,
  MetricGrid,
  SimplePieChart
} from '../../components/admin/ReportCharts';
import {
  ReportFilters,
  AttendanceReportData,
  ProductivityReportData,
  LocationReportData,
  TeamReportData,
  MonthlyReportData,
  generateAttendanceReport,
  generateProductivityReport,
  generateLocationReport,
  generateTeamReport,
  generateMonthlyReport
} from '../../services/reportsService';
import {
  exportAttendanceReportToPDF,
  exportProductivityReportToPDF,
  exportLocationReportToPDF,
  exportTeamReportToPDF,
  exportMonthlyReportToPDF,
  exportAttendanceReportToExcel,
  exportProductivityReportToExcel,
  exportLocationReportToExcel,
  exportTeamReportToExcel,
  exportMonthlyReportToExcel,
  exportToCSV
} from '../../services/exportService';

type ReportType =
  | 'attendance'
  | 'productivity'
  | 'location'
  | 'monthly'
  | 'team'
  | 'custom';

export default function AdminReports() {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Report data states
  const [attendanceData, setAttendanceData] = useState<AttendanceReportData[]>([]);
  const [productivityData, setProductivityData] = useState<ProductivityReportData[]>([]);
  const [locationData, setLocationData] = useState<LocationReportData[]>([]);
  const [teamData, setTeamData] = useState<TeamReportData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyReportData | null>(null);

  // Filters - Use local timezone with full day range
  const today = new Date();
  const defaultFilters: ReportFilters = {
    startDate: new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0), // Jan 1 at 00:00:00 local
    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999), // Today at 23:59:59 local
  };
  const [currentFilters, setCurrentFilters] = useState<ReportFilters>(defaultFilters);

  const reportTypes = [
    {
      id: 'attendance' as ReportType,
      title: 'Reporte de Asistencia',
      description: 'Análisis detallado de puntualidad y asistencia por empleado',
      icon: ClockIcon,
      color: 'blue'
    },
    {
      id: 'productivity' as ReportType,
      title: 'Reporte de Productividad',
      description: 'Métricas de rendimiento y horas trabajadas por empleado',
      icon: ChartBarIcon,
      color: 'green'
    },
    {
      id: 'location' as ReportType,
      title: 'Reporte de Ubicaciones',
      description: 'Análisis de check-ins por kiosco y precisión GPS',
      icon: MapPinIcon,
      color: 'purple'
    },
    {
      id: 'monthly' as ReportType,
      title: 'Reporte Mensual',
      description: 'Resumen ejecutivo mensual con KPIs principales',
      icon: CalendarDaysIcon,
      color: 'yellow'
    },
    {
      id: 'team' as ReportType,
      title: 'Reporte de Equipos',
      description: 'Análisis comparativo por hubs y departamentos',
      icon: UsersIcon,
      color: 'red'
    },
    {
      id: 'custom' as ReportType,
      title: 'Reporte Personalizado',
      description: 'Constructor de reportes con filtros avanzados',
      icon: DocumentTextIcon,
      color: 'gray'
    }
  ];

  const handleGenerateReport = async (filters: ReportFilters) => {
    if (!selectedReport) return;

    setIsLoading(true);
    setError(null);
    setCurrentFilters(filters);

    try {
      switch (selectedReport) {
        case 'attendance':
          const attendanceReport = await generateAttendanceReport(filters);
          setAttendanceData(attendanceReport);
          break;
        case 'productivity':
          const productivityReport = await generateProductivityReport(filters);
          setProductivityData(productivityReport);
          break;
        case 'location':
          const locationReport = await generateLocationReport(filters);
          setLocationData(locationReport);
          break;
        case 'team':
          const teamReport = await generateTeamReport(filters);
          setTeamData(teamReport);
          break;
        case 'monthly':
          const monthlyReport = await generateMonthlyReport(filters);
          setMonthlyData(monthlyReport);
          break;
        case 'custom':
          // Generate all reports for custom view
          const [att, prod, loc, team, monthly] = await Promise.all([
            generateAttendanceReport(filters),
            generateProductivityReport(filters),
            generateLocationReport(filters),
            generateTeamReport(filters),
            generateMonthlyReport(filters)
          ]);
          setAttendanceData(att);
          setProductivityData(prod);
          setLocationData(loc);
          setTeamData(team);
          setMonthlyData(monthly);
          break;
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Error al generar el reporte. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    if (!selectedReport) return;

    try {
      switch (selectedReport) {
        case 'attendance':
          if (format === 'pdf') {
            exportAttendanceReportToPDF(attendanceData, currentFilters.startDate, currentFilters.endDate);
          } else if (format === 'excel') {
            exportAttendanceReportToExcel(attendanceData, currentFilters.startDate, currentFilters.endDate);
          } else {
            exportToCSV(attendanceData, 'reporte-asistencia');
          }
          break;
        case 'productivity':
          if (format === 'pdf') {
            exportProductivityReportToPDF(productivityData, currentFilters.startDate, currentFilters.endDate);
          } else if (format === 'excel') {
            exportProductivityReportToExcel(productivityData, currentFilters.startDate, currentFilters.endDate);
          } else {
            exportToCSV(productivityData, 'reporte-productividad');
          }
          break;
        case 'location':
          if (format === 'pdf') {
            exportLocationReportToPDF(locationData, currentFilters.startDate, currentFilters.endDate);
          } else if (format === 'excel') {
            exportLocationReportToExcel(locationData, currentFilters.startDate, currentFilters.endDate);
          } else {
            exportToCSV(locationData, 'reporte-ubicaciones');
          }
          break;
        case 'team':
          if (format === 'pdf') {
            exportTeamReportToPDF(teamData, currentFilters.startDate, currentFilters.endDate);
          } else if (format === 'excel') {
            exportTeamReportToExcel(teamData, currentFilters.startDate, currentFilters.endDate);
          } else {
            exportToCSV(teamData, 'reporte-equipos');
          }
          break;
        case 'monthly':
          if (monthlyData) {
            if (format === 'pdf') {
              exportMonthlyReportToPDF(monthlyData);
            } else if (format === 'excel') {
              exportMonthlyReportToExcel(monthlyData);
            }
          }
          break;
      }
    } catch (err) {
      console.error('Error exporting report:', err);
      setError('Error al exportar el reporte. Por favor intenta de nuevo.');
    }
  };

  const renderReportContent = () => {
    if (!selectedReport) {
      return (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Selecciona un tipo de reporte
          </h3>
          <p className="text-sm text-gray-600">
            Elige uno de los reportes disponibles arriba para comenzar
          </p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generando reporte...</p>
        </div>
      );
    }

    switch (selectedReport) {
      case 'attendance':
        return <AttendanceReportView data={attendanceData} />;
      case 'productivity':
        return <ProductivityReportView data={productivityData} />;
      case 'location':
        return <LocationReportView data={locationData} />;
      case 'team':
        return <TeamReportView data={teamData} />;
      case 'monthly':
        return monthlyData ? <MonthlyReportView data={monthlyData} /> : null;
      case 'custom':
        return <CustomReportView
          attendanceData={attendanceData}
          productivityData={productivityData}
          locationData={locationData}
          teamData={teamData}
          monthlyData={monthlyData}
        />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Reportes y Análisis
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Genera reportes detallados y analiza el rendimiento del sistema de asistencia
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {user?.name}
              </div>
              <div className="text-xs text-gray-500">
                {user?.role === 'super_admin' ? 'Super Administrador' : 'Administrador'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          title="Error"
          message={error}
        />
      )}

      {/* Report Type Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Tipos de Reportes Disponibles
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`relative bg-gray-50 border-2 rounded-lg p-4 hover:shadow-md transition-all text-left ${
                selectedReport === report.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 p-2 rounded-lg ${
                  selectedReport === report.id ? 'bg-primary-100' : 'bg-gray-100'
                }`}>
                  <report.icon className={`h-6 w-6 ${
                    selectedReport === report.id ? 'text-primary-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    {report.title}
                  </h4>
                  <p className="text-xs text-gray-600">
                    {report.description}
                  </p>
                </div>
              </div>
              {selectedReport === report.id && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      {selectedReport && (
        <ReportFiltersComponent
          onFilterChange={handleGenerateReport}
          initialFilters={currentFilters}
          autoApply={false}
        />
      )}

      {/* Export Buttons */}
      {selectedReport && (attendanceData.length > 0 || productivityData.length > 0 || locationData.length > 0 || teamData.length > 0 || monthlyData) && (
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Exportar Reporte</h3>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf')}
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('excel')}
              >
                <TableCellsIcon className="h-4 w-4 mr-1" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                CSV
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Report Content */}
      {renderReportContent()}
    </div>
  );
}

// Report View Components

function AttendanceReportView({ data }: { data: AttendanceReportData[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-12 text-center border-2 border-dashed border-blue-200">
        <div className="max-w-md mx-auto">
          <div className="p-4 bg-white rounded-full inline-block mb-4 shadow-lg">
            <ClockIcon className="h-16 w-16 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Sin Datos de Asistencia
          </h3>
          <p className="text-gray-600 mb-6">
            No se encontraron registros de check-ins para el período seleccionado.
          </p>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-2">💡 Sugerencias:</p>
            <ul className="text-sm text-left text-gray-600 space-y-1">
              <li>• Amplía el rango de fechas</li>
              <li>• Verifica que hay check-ins registrados</li>
              <li>• Revisa la consola del navegador (F12) para más detalles</li>
              <li>• Intenta eliminar algunos filtros avanzados</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const avgPunctuality = data.reduce((sum, d) => sum + d.punctualityRate, 0) / data.length;
  const avgAttendance = data.reduce((sum, d) => sum + d.attendanceRate, 0) / data.length;
  const totalLateMinutes = data.reduce((sum, d) => sum + d.totalLateMinutes, 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Empleados Analizados"
          value={data.length}
          icon={<UsersIcon className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Puntualidad Promedio"
          value={`${avgPunctuality.toFixed(1)}%`}
          icon={<ClockIcon className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Asistencia Promedio"
          value={`${avgAttendance.toFixed(1)}%`}
          icon={<ChartBarIcon className="h-6 w-6" />}
          color="purple"
        />
        <StatCard
          title="Minutos Tarde Total"
          value={totalLateMinutes}
          icon={<DocumentTextIcon className="h-6 w-6" />}
          color="red"
        />
      </div>

      {/* Top 10 Punctuality Chart */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Top 10 - Mejor Puntualidad
        </h3>
        <BarChart
          data={data.slice(0, 10).map(d => ({
            label: d.userName,
            value: d.punctualityRate,
            color: d.punctualityRate >= 90 ? 'bg-green-500' : d.punctualityRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
          }))}
          maxValue={100}
        />
      </div>

      {/* Detailed Table */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Detalle Completo
        </h3>
        <DataTable
          data={data}
          columns={[
            { key: 'userName', label: 'Empleado' },
            { key: 'totalCheckIns', label: 'Check-ins' },
            { key: 'onTimeCheckIns', label: 'A Tiempo' },
            { key: 'lateCheckIns', label: 'Retrasados' },
            {
              key: 'punctualityRate',
              label: 'Puntualidad',
              render: (value) => (
                <span className={`font-medium ${
                  value >= 90 ? 'text-green-600' : value >= 70 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {value.toFixed(1)}%
                </span>
              )
            },
            {
              key: 'attendanceRate',
              label: 'Asistencia',
              render: (value) => `${value.toFixed(1)}%`
            },
            { key: 'totalLateMinutes', label: 'Min. Tarde' },
          ]}
        />
      </div>
    </div>
  );
}

function ProductivityReportView({ data }: { data: ProductivityReportData[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-12 text-center border-2 border-dashed border-green-200">
        <div className="max-w-md mx-auto">
          <div className="p-4 bg-white rounded-full inline-block mb-4 shadow-lg">
            <ChartBarIcon className="h-16 w-16 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Sin Datos de Productividad
          </h3>
          <p className="text-gray-600 mb-6">
            No se encontraron registros para calcular productividad en el período seleccionado.
          </p>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-2">💡 Intenta:</p>
            <ul className="text-sm text-left text-gray-600 space-y-1">
              <li>• Amplía el rango de fechas</li>
              <li>• Verifica los filtros aplicados</li>
              <li>• Asegúrate que hay check-ins de entrada y salida</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const totalWorkHours = data.reduce((sum, d) => sum + d.totalWorkHours, 0);
  const avgWorkHours = totalWorkHours / data.length;
  const totalPerfectDays = data.reduce((sum, d) => sum + d.perfectDays, 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Horas Trabajadas Total"
          value={totalWorkHours.toFixed(1)}
          icon={<ClockIcon className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Promedio Horas/Empleado"
          value={avgWorkHours.toFixed(1)}
          icon={<ChartBarIcon className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Días Perfectos Total"
          value={totalPerfectDays}
          icon={<DocumentTextIcon className="h-6 w-6" />}
          color="purple"
        />
        <StatCard
          title="Empleados Analizados"
          value={data.length}
          icon={<UsersIcon className="h-6 w-6" />}
          color="yellow"
        />
      </div>

      {/* Top Performers */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Top 10 - Más Horas Trabajadas
        </h3>
        <BarChart
          data={data.slice(0, 10).map(d => ({
            label: d.userName,
            value: d.totalWorkHours,
            color: 'bg-blue-500'
          }))}
        />
      </div>

      {/* Detailed Table */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Detalle Completo
        </h3>
        <DataTable
          data={data}
          columns={[
            { key: 'userName', label: 'Empleado' },
            {
              key: 'totalWorkHours',
              label: 'Hrs Totales',
              render: (value) => value.toFixed(1)
            },
            {
              key: 'averageWorkHoursPerDay',
              label: 'Hrs/Día',
              render: (value) => value.toFixed(1)
            },
            { key: 'workDays', label: 'Días Trab.' },
            { key: 'lateArrivals', label: 'Llegadas Tarde' },
            { key: 'earlyDepartures', label: 'Salidas Temp.' },
            { key: 'perfectDays', label: 'Días Perfectos' },
          ]}
        />
      </div>
    </div>
  );
}

function LocationReportView({ data }: { data: LocationReportData[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-12 text-center">
        <MapPinIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No hay datos de ubicaciones para el período seleccionado</p>
      </div>
    );
  }

  const totalCheckIns = data.reduce((sum, d) => sum + d.totalCheckIns, 0);
  const avgAccuracy = data.reduce((sum, d) => sum + d.locationAccuracyRate, 0) / data.length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Kioscos"
          value={data.length}
          icon={<MapPinIcon className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Check-ins Total"
          value={totalCheckIns}
          icon={<DocumentTextIcon className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Precisión GPS Promedio"
          value={`${avgAccuracy.toFixed(1)}%`}
          icon={<ChartBarIcon className="h-6 w-6" />}
          color="purple"
        />
      </div>

      {/* Top Locations */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Kioscos Más Activos
        </h3>
        <BarChart
          data={data.slice(0, 10).map(d => ({
            label: d.kioskName,
            value: d.totalCheckIns,
            color: 'bg-purple-500'
          }))}
        />
      </div>

      {/* Detailed Table */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Detalle Completo
        </h3>
        <DataTable
          data={data}
          columns={[
            { key: 'kioskName', label: 'Kiosco' },
            { key: 'totalCheckIns', label: 'Check-ins' },
            { key: 'uniqueUsers', label: 'Usuarios' },
            {
              key: 'averageCheckInsPerDay',
              label: 'Promedio/Día',
              render: (value) => value.toFixed(1)
            },
            {
              key: 'locationAccuracyRate',
              label: 'Precisión GPS',
              render: (value) => `${value.toFixed(1)}%`
            },
          ]}
        />
      </div>
    </div>
  );
}

function TeamReportView({ data }: { data: TeamReportData[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-12 text-center">
        <UsersIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No hay datos de equipos para el período seleccionado</p>
      </div>
    );
  }

  const totalEmployees = data.reduce((sum, d) => sum + d.totalEmployees, 0);
  const avgPunctuality = data.reduce((sum, d) => sum + d.averagePunctualityRate, 0) / data.length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Hubs"
          value={data.length}
          icon={<UsersIcon className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Total Empleados"
          value={totalEmployees}
          icon={<DocumentTextIcon className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Puntualidad Promedio"
          value={`${avgPunctuality.toFixed(1)}%`}
          icon={<ChartBarIcon className="h-6 w-6" />}
          color="purple"
        />
      </div>

      {/* Team Comparison */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Comparación de Hubs - Puntualidad
        </h3>
        <BarChart
          data={data.map(d => ({
            label: d.hubName,
            value: d.averagePunctualityRate,
            color: d.averagePunctualityRate >= 90 ? 'bg-green-500' : d.averagePunctualityRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
          }))}
          maxValue={100}
        />
      </div>

      {/* Detailed Table */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Detalle Completo
        </h3>
        <DataTable
          data={data}
          columns={[
            { key: 'hubName', label: 'Hub' },
            { key: 'totalEmployees', label: 'Empleados' },
            { key: 'activeEmployees', label: 'Activos' },
            { key: 'totalCheckIns', label: 'Check-ins' },
            {
              key: 'averagePunctualityRate',
              label: 'Puntualidad',
              render: (value) => `${value.toFixed(1)}%`
            },
            {
              key: 'attendanceRate',
              label: 'Asistencia',
              render: (value) => `${value.toFixed(1)}%`
            },
          ]}
        />
      </div>
    </div>
  );
}

function MonthlyReportView({ data }: { data: MonthlyReportData }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 shadow rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">
          Reporte Mensual - {data.month} {data.year}
        </h2>
        <p className="text-blue-100">
          Resumen ejecutivo del rendimiento del sistema de asistencia
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Empleados"
          value={data.totalEmployees}
          icon={<UsersIcon className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Check-ins"
          value={data.totalCheckIns}
          icon={<DocumentTextIcon className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Horas Trabajadas"
          value={data.totalWorkHours.toFixed(0)}
          icon={<ClockIcon className="h-6 w-6" />}
          color="purple"
        />
        <StatCard
          title="Llegadas Tarde"
          value={data.totalLateArrivals}
          icon={<ChartBarIcon className="h-6 w-6" />}
          color="red"
        />
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">
            Tasa de Puntualidad
          </h3>
          <div className="flex justify-center">
            <ProgressRing
              percentage={data.averagePunctualityRate}
              color="#10b981"
              label="Puntualidad"
            />
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">
            Tasa de Asistencia
          </h3>
          <div className="flex justify-center">
            <ProgressRing
              percentage={data.averageAttendanceRate}
              color="#3b82f6"
              label="Asistencia"
            />
          </div>
        </div>
      </div>

      {/* Top and Bottom Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-green-900 mb-4">
            Mejores Desempeños
          </h3>
          <DataTable
            data={data.topPerformers}
            columns={[
              { key: 'userName', label: 'Empleado' },
              {
                key: 'score',
                label: 'Puntualidad',
                render: (value) => (
                  <span className="text-green-600 font-semibold">
                    {value.toFixed(1)}%
                  </span>
                )
              },
            ]}
            maxHeight="300px"
          />
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-900 mb-4">
            Requieren Atención
          </h3>
          <DataTable
            data={data.bottomPerformers}
            columns={[
              { key: 'userName', label: 'Empleado' },
              {
                key: 'score',
                label: 'Puntualidad',
                render: (value) => (
                  <span className="text-red-600 font-semibold">
                    {value.toFixed(1)}%
                  </span>
                )
              },
            ]}
            maxHeight="300px"
          />
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Métricas del Período
        </h3>
        <MetricGrid
          metrics={[
            { label: 'Total Ausencias', value: data.totalAbsences, color: 'text-red-600' },
            { label: 'Llegadas Tarde', value: data.totalLateArrivals, color: 'text-yellow-600' },
            { label: 'Check-ins Totales', value: data.totalCheckIns, color: 'text-blue-600' },
          ]}
        />
      </div>
    </div>
  );
}

function CustomReportView({
  attendanceData,
  productivityData,
  locationData,
  teamData,
  monthlyData
}: {
  attendanceData: AttendanceReportData[];
  productivityData: ProductivityReportData[];
  locationData: LocationReportData[];
  teamData: TeamReportData[];
  monthlyData: MonthlyReportData | null;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Vista Personalizada - Todos los Reportes
        </h3>
        <p className="text-sm text-gray-600">
          Esta vista combina información de todos los tipos de reportes disponibles.
          Usa los filtros arriba para refinar los datos y exporta en el formato que prefieras.
        </p>
      </div>

      {monthlyData && <MonthlyReportView data={monthlyData} />}

      {attendanceData.length > 0 && (
        <div className="border-t-4 border-blue-500 pt-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Asistencia</h3>
          <AttendanceReportView data={attendanceData} />
        </div>
      )}

      {productivityData.length > 0 && (
        <div className="border-t-4 border-green-500 pt-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Productividad</h3>
          <ProductivityReportView data={productivityData} />
        </div>
      )}

      {locationData.length > 0 && (
        <div className="border-t-4 border-purple-500 pt-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Ubicaciones</h3>
          <LocationReportView data={locationData} />
        </div>
      )}

      {teamData.length > 0 && (
        <div className="border-t-4 border-red-500 pt-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Equipos</h3>
          <TeamReportView data={teamData} />
        </div>
      )}
    </div>
  );
}
