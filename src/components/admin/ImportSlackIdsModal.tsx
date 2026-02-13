import React, { useState, useRef } from 'react';
import { Modal, Button, Alert } from '../ui';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { User } from '../../types';
import { DocumentArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ImportSlackIdsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: User[];
}

interface SlackImportRow {
  email: string;
  slackId: string;
}

interface MatchedUser {
  user: User;
  newSlackId: string;
  changed: boolean;
}

export function ImportSlackIdsModal({ isOpen, onClose, onSuccess, users }: ImportSlackIdsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matched, setMatched] = useState<MatchedUser[]>([]);
  const [notFound, setNotFound] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ updated: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): SlackImportRow[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) throw new Error('El archivo debe tener al menos una fila de encabezado y una fila de datos');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const emailIdx = headers.findIndex(h => h === 'email' || h === 'correo');
    const slackIdx = headers.findIndex(h => h === 'slackid' || h === 'slack_id' || h === 'slack id');

    if (emailIdx === -1) throw new Error('No se encontró la columna "email" en el CSV');
    if (slackIdx === -1) throw new Error('No se encontró la columna "slackId" (o "slack_id") en el CSV');

    const rows: SlackImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const email = values[emailIdx]?.toLowerCase() || '';
      const slackId = values[slackIdx] || '';
      if (email) rows.push({ email, slackId });
    }
    return rows;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Por favor selecciona un archivo CSV');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setMatched([]);
    setNotFound([]);
    setImportResult(null);

    try {
      const text = await selectedFile.text();
      const rows = parseCSV(text);

      const userByEmail = new Map(users.map(u => [u.email.toLowerCase(), u]));
      const matchedUsers: MatchedUser[] = [];
      const missingEmails: string[] = [];

      for (const row of rows) {
        const user = userByEmail.get(row.email);
        if (user) {
          matchedUsers.push({
            user,
            newSlackId: row.slackId,
            changed: user.slackId !== row.slackId
          });
        } else {
          missingEmails.push(row.email);
        }
      }

      setMatched(matchedUsers);
      setNotFound(missingEmails);
    } catch (err: any) {
      setError(err.message || 'Error leyendo el archivo CSV');
    }
  };

  const handleImport = async () => {
    if (matched.length === 0) return;

    const toUpdate = matched.filter(m => m.changed);
    if (toUpdate.length === 0) {
      setImportResult({ updated: 0, skipped: matched.length });
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      await Promise.all(
        toUpdate.map(m =>
          updateDoc(doc(db, 'users', m.user.id), {
            slackId: m.newSlackId || null,
            updatedAt: new Date()
          })
        )
      );

      setImportResult({ updated: toUpdate.length, skipped: matched.length - toUpdate.length });
      onSuccess();
    } catch (err) {
      console.error('Error importing Slack IDs:', err);
      setError('Error al actualizar Slack IDs en la base de datos');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setMatched([]);
    setNotFound([]);
    setError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const toUpdate = matched.filter(m => m.changed);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Slack IDs desde CSV" size="xl">
      <div className="space-y-6">

        {/* Format instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-800 mb-1">Formato del CSV</p>
          <p className="text-xs text-blue-700 mb-2">El archivo debe tener las columnas <code className="bg-blue-100 px-1 rounded">email</code> y <code className="bg-blue-100 px-1 rounded">slackId</code> (también acepta <code className="bg-blue-100 px-1 rounded">slack_id</code>).</p>
          <pre className="text-xs text-blue-900 bg-blue-100 rounded p-2 font-mono">email,slackId{'\n'}juan.perez@avivacredito.com,U01A2B3C4D5{'\n'}maria.lopez@avivacredito.com,U09Z8Y7X6W5</pre>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar archivo CSV
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-primary-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}>
            <div className="space-y-1 text-center">
              <DocumentArrowUpIcon className="mx-auto h-10 w-10 text-gray-400" />
              <div className="text-sm text-gray-600">
                <span className="font-medium text-primary-600 hover:text-primary-500">Sube un archivo</span>
                {' '}o arrastra y suelta
              </div>
              <p className="text-xs text-gray-500">CSV hasta 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={handleFileSelect}
              />
            </div>
          </div>
          {file && (
            <p className="mt-2 text-sm text-gray-600">Archivo: <strong>{file.name}</strong></p>
          )}
        </div>

        {/* Error */}
        {error && <Alert type="error" message={error} />}

        {/* Import result */}
        {importResult && (
          <Alert
            type="success"
            message={`Importación completada: ${importResult.updated} Slack ID(s) actualizados, ${importResult.skipped} ya estaban al día.`}
          />
        )}

        {/* Preview */}
        {!importResult && matched.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">
                Resultados del archivo
              </h4>
              <div className="flex gap-3 text-xs">
                <span className="text-green-700 font-medium">{toUpdate.length} a actualizar</span>
                <span className="text-gray-500">{matched.length - toUpdate.length} sin cambios</span>
                {notFound.length > 0 && <span className="text-yellow-700">{notFound.length} no encontrados</span>}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {matched.map((m) => (
                <div key={m.user.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-gray-900">{m.user.name}</span>
                    <span className="ml-2 text-gray-500 text-xs">{m.user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    {m.changed ? (
                      <>
                        <span className="text-xs text-gray-400 line-through">{m.user.slackId || 'sin ID'}</span>
                        <span className="text-xs">→</span>
                        <span className="text-xs font-mono bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{m.newSlackId || 'vacío'}</span>
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">sin cambios</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {notFound.length > 0 && (
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-800">
                    {notFound.length} correo(s) no encontrados en el sistema:
                  </p>
                </div>
                <p className="text-xs text-yellow-700 font-mono">{notFound.join(', ')}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={handleClose} disabled={processing}>
            {importResult ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!importResult && (
            <Button
              onClick={handleImport}
              loading={processing}
              disabled={toUpdate.length === 0 || !!error}
            >
              {toUpdate.length > 0
                ? `Actualizar ${toUpdate.length} Slack ID(s)`
                : 'Sin cambios para importar'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
