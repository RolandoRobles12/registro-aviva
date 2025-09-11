// src/utils/export.ts - Fixed version
import { formatTimestamp } from './formatters';
import { CHECK_IN_TYPES, CHECK_IN_STATUS } from './constants';

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: Record<keyof T, string>
): void {
  if (data.length === 0) return;

  const keys = Object.keys(data[0]) as (keyof T)[];
  const csvHeaders = keys.map(key => headers?.[key] || String(key)).join(',');
  
  const csvRows = data.map(item => 
    keys.map(key => {
      const value = item[key];
      // Handle nested objects and arrays
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value).replace(/"/g, '""');
      }
      // Escape commas and quotes
      const stringValue = String(value || '');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  const csvContent = [csvHeaders, ...csvRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  URL.revokeObjectURL(link.href);
}

export function generateReportData(
  checkIns: any[],
  filters: any
): Record<string, any>[] {
  return checkIns.map(checkIn => ({
    'Fecha': formatTimestamp(checkIn.timestamp),
    'Usuario': checkIn.userName,
    'Kiosco': checkIn.kioskName,
    'Producto': checkIn.productType,
    'Tipo': CHECK_IN_TYPES[checkIn.type as keyof typeof CHECK_IN_TYPES] || checkIn.type,
    'Estado': CHECK_IN_STATUS[checkIn.status as keyof typeof CHECK_IN_STATUS] || checkIn.status,
    'Distancia (m)': checkIn.validationResults?.distanceFromKiosk || 0,
    'Ubicación Válida': checkIn.validationResults?.locationValid ? 'Sí' : 'No',
    'Latitud': checkIn.location?.latitude || '',
    'Longitud': checkIn.location?.longitude || '',
    'Notas': checkIn.notes || ''
  }));
}