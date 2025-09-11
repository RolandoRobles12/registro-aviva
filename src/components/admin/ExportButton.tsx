import React, { useState } from 'react';
import { Button } from '../ui';
import { exportToCSV } from '../../utils/export';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface ExportButtonProps {
  onExport: () => Record<string, any>[];
  filename: string;
  disabled?: boolean;
}

export function ExportButton({ onExport, filename, disabled = false }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      const data = onExport();
      
      if (data.length === 0) {
        alert('No hay datos para exportar');
        return;
      }

      exportToCSV(data, filename);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error al exportar los datos');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="secondary"
      onClick={handleExport}
      loading={exporting}
      disabled={disabled}
      leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
    >
      Exportar CSV
    </Button>
  );
}