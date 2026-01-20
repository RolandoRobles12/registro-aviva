// src/services/exportService.ts - Service for exporting reports to PDF, Excel, and CSV
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  AttendanceReportData,
  ProductivityReportData,
  LocationReportData,
  TeamReportData,
  MonthlyReportData
} from './reportsService';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * Export Attendance Report to PDF
 */
export function exportAttendanceReportToPDF(
  data: AttendanceReportData[],
  startDate: Date,
  endDate: Date
): void {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('Reporte de Asistencia', 14, 20);

  doc.setFontSize(11);
  doc.text(
    `Período: ${startDate.toLocaleDateString('es-MX')} - ${endDate.toLocaleDateString('es-MX')}`,
    14,
    28
  );
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 34);

  // Table
  const tableData = data.map(row => [
    row.userName,
    row.totalCheckIns,
    row.onTimeCheckIns,
    row.lateCheckIns,
    `${row.punctualityRate.toFixed(1)}%`,
    row.totalLateMinutes,
    `${row.attendanceRate.toFixed(1)}%`,
  ]);

  doc.autoTable({
    startY: 40,
    head: [[
      'Empleado',
      'Check-ins',
      'A Tiempo',
      'Retrasados',
      'Puntualidad',
      'Min. Tarde',
      'Asistencia'
    ]],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });

  // Save
  doc.save(`reporte-asistencia-${Date.now()}.pdf`);
}

/**
 * Export Productivity Report to PDF
 */
export function exportProductivityReportToPDF(
  data: ProductivityReportData[],
  startDate: Date,
  endDate: Date
): void {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('Reporte de Productividad', 14, 20);

  doc.setFontSize(11);
  doc.text(
    `Período: ${startDate.toLocaleDateString('es-MX')} - ${endDate.toLocaleDateString('es-MX')}`,
    14,
    28
  );
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 34);

  // Table
  const tableData = data.map(row => [
    row.userName,
    row.totalWorkHours.toFixed(1),
    row.averageWorkHoursPerDay.toFixed(1),
    row.workDays,
    row.lateArrivals,
    row.earlyDepartures,
    row.perfectDays,
  ]);

  doc.autoTable({
    startY: 40,
    head: [[
      'Empleado',
      'Hrs Totales',
      'Hrs/Día',
      'Días Trab.',
      'Llegadas Tarde',
      'Salidas Temp.',
      'Días Perfectos'
    ]],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });

  doc.save(`reporte-productividad-${Date.now()}.pdf`);
}

/**
 * Export Location Report to PDF
 */
export function exportLocationReportToPDF(
  data: LocationReportData[],
  startDate: Date,
  endDate: Date
): void {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('Reporte de Ubicaciones', 14, 20);

  doc.setFontSize(11);
  doc.text(
    `Período: ${startDate.toLocaleDateString('es-MX')} - ${endDate.toLocaleDateString('es-MX')}`,
    14,
    28
  );
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 34);

  // Table
  const tableData = data.map(row => [
    row.kioskName,
    row.totalCheckIns,
    row.uniqueUsers,
    row.averageCheckInsPerDay.toFixed(1),
    `${row.locationAccuracyRate.toFixed(1)}%`,
    row.peakHour,
  ]);

  doc.autoTable({
    startY: 40,
    head: [[
      'Kiosco',
      'Check-ins',
      'Usuarios',
      'Promedio/Día',
      'Precisión GPS',
      'Hora Pico'
    ]],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });

  doc.save(`reporte-ubicaciones-${Date.now()}.pdf`);
}

/**
 * Export Team Report to PDF
 */
export function exportTeamReportToPDF(
  data: TeamReportData[],
  startDate: Date,
  endDate: Date
): void {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('Reporte de Equipos', 14, 20);

  doc.setFontSize(11);
  doc.text(
    `Período: ${startDate.toLocaleDateString('es-MX')} - ${endDate.toLocaleDateString('es-MX')}`,
    14,
    28
  );
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 34);

  // Table
  const tableData = data.map(row => [
    row.hubName,
    row.totalEmployees,
    row.activeEmployees,
    row.totalCheckIns,
    `${row.averagePunctualityRate.toFixed(1)}%`,
    `${row.attendanceRate.toFixed(1)}%`,
    row.totalLateMinutes,
  ]);

  doc.autoTable({
    startY: 40,
    head: [[
      'Hub',
      'Empleados',
      'Activos',
      'Check-ins',
      'Puntualidad',
      'Asistencia',
      'Min. Tarde'
    ]],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });

  doc.save(`reporte-equipos-${Date.now()}.pdf`);
}

/**
 * Export Monthly Report to PDF
 */
export function exportMonthlyReportToPDF(data: MonthlyReportData): void {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('Reporte Mensual Ejecutivo', 14, 20);

  doc.setFontSize(11);
  doc.text(`${data.month} ${data.year}`, 14, 28);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 34);

  // Summary Statistics
  doc.setFontSize(14);
  doc.text('Resumen General', 14, 45);

  doc.setFontSize(10);
  const summaryY = 52;
  const lineHeight = 6;

  doc.text(`Total de Empleados: ${data.totalEmployees}`, 14, summaryY);
  doc.text(`Total de Check-ins: ${data.totalCheckIns}`, 14, summaryY + lineHeight);
  doc.text(`Horas Trabajadas: ${data.totalWorkHours.toFixed(1)}`, 14, summaryY + lineHeight * 2);
  doc.text(`Tasa de Puntualidad: ${data.averagePunctualityRate.toFixed(1)}%`, 14, summaryY + lineHeight * 3);
  doc.text(`Tasa de Asistencia: ${data.averageAttendanceRate.toFixed(1)}%`, 14, summaryY + lineHeight * 4);
  doc.text(`Total de Ausencias: ${data.totalAbsences}`, 14, summaryY + lineHeight * 5);
  doc.text(`Llegadas Tarde: ${data.totalLateArrivals}`, 14, summaryY + lineHeight * 6);

  // Top Performers
  doc.setFontSize(14);
  doc.text('Mejores Desempeños', 14, 95);

  const topPerformersData = data.topPerformers.map(p => [
    p.userName,
    `${p.score.toFixed(1)}%`
  ]);

  doc.autoTable({
    startY: 100,
    head: [['Empleado', 'Puntualidad']],
    body: topPerformersData,
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] },
    styles: { fontSize: 9 },
  });

  // Bottom Performers
  const finalY = (doc as any).lastAutoTable.finalY || 140;
  doc.setFontSize(14);
  doc.text('Requieren Atención', 14, finalY + 10);

  const bottomPerformersData = data.bottomPerformers.map(p => [
    p.userName,
    `${p.score.toFixed(1)}%`
  ]);

  doc.autoTable({
    startY: finalY + 15,
    head: [['Empleado', 'Puntualidad']],
    body: bottomPerformersData,
    theme: 'striped',
    headStyles: { fillColor: [239, 68, 68] },
    styles: { fontSize: 9 },
  });

  doc.save(`reporte-mensual-${data.month}-${data.year}.pdf`);
}

/**
 * Export Attendance Report to Excel
 */
export function exportAttendanceReportToExcel(
  data: AttendanceReportData[],
  startDate: Date,
  endDate: Date
): void {
  const ws = XLSX.utils.json_to_sheet(
    data.map(row => ({
      'Empleado': row.userName,
      'Total Check-ins': row.totalCheckIns,
      'A Tiempo': row.onTimeCheckIns,
      'Retrasados': row.lateCheckIns,
      'Tasa Puntualidad (%)': row.punctualityRate.toFixed(2),
      'Minutos Tarde': row.totalLateMinutes,
      'Promedio Min. Tarde': row.averageLateMinutes.toFixed(2),
      'Días Asistencia': row.attendanceDays,
      'Días Esperados': row.expectedDays,
      'Tasa Asistencia (%)': row.attendanceRate.toFixed(2),
      'Check-ins Entrada': row.checkInsByType.entrada,
      'Check-ins Comida': row.checkInsByType.comida,
      'Check-ins Regreso': row.checkInsByType.regreso_comida,
      'Check-ins Salida': row.checkInsByType.salida,
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');

  // Add metadata sheet
  const metaWs = XLSX.utils.json_to_sheet([
    {
      'Reporte': 'Asistencia',
      'Fecha Inicio': startDate.toLocaleDateString('es-MX'),
      'Fecha Fin': endDate.toLocaleDateString('es-MX'),
      'Generado': new Date().toLocaleString('es-MX')
    }
  ]);
  XLSX.utils.book_append_sheet(wb, metaWs, 'Metadata');

  XLSX.writeFile(wb, `reporte-asistencia-${Date.now()}.xlsx`);
}

/**
 * Export Productivity Report to Excel
 */
export function exportProductivityReportToExcel(
  data: ProductivityReportData[],
  startDate: Date,
  endDate: Date
): void {
  const ws = XLSX.utils.json_to_sheet(
    data.map(row => ({
      'Empleado': row.userName,
      'Horas Totales': row.totalWorkHours.toFixed(2),
      'Promedio Horas/Día': row.averageWorkHoursPerDay.toFixed(2),
      'Minutos Comida Total': row.totalLunchMinutes.toFixed(0),
      'Promedio Min. Comida': row.averageLunchMinutes.toFixed(2),
      'Días Trabajados': row.workDays,
      'Salidas Tempranas': row.earlyDepartures,
      'Llegadas Tarde': row.lateArrivals,
      'Días Perfectos': row.perfectDays,
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productividad');

  const metaWs = XLSX.utils.json_to_sheet([
    {
      'Reporte': 'Productividad',
      'Fecha Inicio': startDate.toLocaleDateString('es-MX'),
      'Fecha Fin': endDate.toLocaleDateString('es-MX'),
      'Generado': new Date().toLocaleString('es-MX')
    }
  ]);
  XLSX.utils.book_append_sheet(wb, metaWs, 'Metadata');

  XLSX.writeFile(wb, `reporte-productividad-${Date.now()}.xlsx`);
}

/**
 * Export Location Report to Excel
 */
export function exportLocationReportToExcel(
  data: LocationReportData[],
  startDate: Date,
  endDate: Date
): void {
  const ws = XLSX.utils.json_to_sheet(
    data.map(row => ({
      'Kiosco': row.kioskName,
      'Total Check-ins': row.totalCheckIns,
      'Usuarios Únicos': row.uniqueUsers,
      'Promedio Check-ins/Día': row.averageCheckInsPerDay.toFixed(2),
      'Check-ins Ubicación Inválida': row.invalidLocationCheckIns,
      'Tasa Precisión GPS (%)': row.locationAccuracyRate.toFixed(2),
      'Hora Pico': row.peakHour,
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ubicaciones');

  const metaWs = XLSX.utils.json_to_sheet([
    {
      'Reporte': 'Ubicaciones',
      'Fecha Inicio': startDate.toLocaleDateString('es-MX'),
      'Fecha Fin': endDate.toLocaleDateString('es-MX'),
      'Generado': new Date().toLocaleString('es-MX')
    }
  ]);
  XLSX.utils.book_append_sheet(wb, metaWs, 'Metadata');

  XLSX.writeFile(wb, `reporte-ubicaciones-${Date.now()}.xlsx`);
}

/**
 * Export Team Report to Excel
 */
export function exportTeamReportToExcel(
  data: TeamReportData[],
  startDate: Date,
  endDate: Date
): void {
  const ws = XLSX.utils.json_to_sheet(
    data.map(row => ({
      'Hub': row.hubName,
      'Total Empleados': row.totalEmployees,
      'Empleados Activos': row.activeEmployees,
      'Total Check-ins': row.totalCheckIns,
      'Tasa Puntualidad Promedio (%)': row.averagePunctualityRate.toFixed(2),
      'Tasa Asistencia (%)': row.attendanceRate.toFixed(2),
      'Minutos Tarde Total': row.totalLateMinutes,
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Equipos');

  const metaWs = XLSX.utils.json_to_sheet([
    {
      'Reporte': 'Equipos',
      'Fecha Inicio': startDate.toLocaleDateString('es-MX'),
      'Fecha Fin': endDate.toLocaleDateString('es-MX'),
      'Generado': new Date().toLocaleString('es-MX')
    }
  ]);
  XLSX.utils.book_append_sheet(wb, metaWs, 'Metadata');

  XLSX.writeFile(wb, `reporte-equipos-${Date.now()}.xlsx`);
}

/**
 * Export Monthly Report to Excel
 */
export function exportMonthlyReportToExcel(data: MonthlyReportData): void {
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryWs = XLSX.utils.json_to_sheet([
    {
      'Métrica': 'Mes',
      'Valor': `${data.month} ${data.year}`
    },
    {
      'Métrica': 'Total Empleados',
      'Valor': data.totalEmployees
    },
    {
      'Métrica': 'Total Check-ins',
      'Valor': data.totalCheckIns
    },
    {
      'Métrica': 'Horas Trabajadas',
      'Valor': data.totalWorkHours.toFixed(2)
    },
    {
      'Métrica': 'Tasa Puntualidad Promedio (%)',
      'Valor': data.averagePunctualityRate.toFixed(2)
    },
    {
      'Métrica': 'Tasa Asistencia Promedio (%)',
      'Valor': data.averageAttendanceRate.toFixed(2)
    },
    {
      'Métrica': 'Total Ausencias',
      'Valor': data.totalAbsences
    },
    {
      'Métrica': 'Total Llegadas Tarde',
      'Valor': data.totalLateArrivals
    },
  ]);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

  // Top Performers Sheet
  const topWs = XLSX.utils.json_to_sheet(
    data.topPerformers.map(p => ({
      'Empleado': p.userName,
      'Puntualidad (%)': p.score.toFixed(2)
    }))
  );
  XLSX.utils.book_append_sheet(wb, topWs, 'Mejores Desempeños');

  // Bottom Performers Sheet
  const bottomWs = XLSX.utils.json_to_sheet(
    data.bottomPerformers.map(p => ({
      'Empleado': p.userName,
      'Puntualidad (%)': p.score.toFixed(2)
    }))
  );
  XLSX.utils.book_append_sheet(wb, bottomWs, 'Requieren Atención');

  XLSX.writeFile(wb, `reporte-mensual-${data.month}-${data.year}.xlsx`);
}

/**
 * Export to CSV (generic function)
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string
): void {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${Date.now()}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
