// src/components/admin/HubReportModal.tsx
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  EnvelopeIcon,
  PaperAirplaneIcon,
  PencilIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { Modal, Button } from '../ui';
import { Hub } from '../../types';
import { HubReportService, HubDailyReport } from '../../services/hubReportService';
import { sendViaGmail } from '../../services/gmailService';

interface HubReportModalProps {
  hub: Hub;
  onClose: () => void;
}

type ModalState = 'loading' | 'preview' | 'sending' | 'sent' | 'error';

export function HubReportModal({ hub, onClose }: HubReportModalProps) {
  const [state, setState] = useState<ModalState>('loading');
  const [report, setReport] = useState<HubDailyReport | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [recipients, setRecipients] = useState<string>(
    (hub.reportEmails ?? []).join('\n')
  );
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadReport(new Date(selectedDate + 'T12:00:00'));
  }, [selectedDate]);

  const loadReport = async (date: Date) => {
    setState('loading');
    try {
      const data = await HubReportService.getDailyReport(hub, date);
      setReport(data);
      setState('preview');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al generar el reporte');
      setState('error');
    }
  };

  const getEmailHtml = () =>
    report ? HubReportService.buildEmailHtml(report, notes || undefined) : '';

  const handleSend = async () => {
    const recipientList = recipients
      .split(/[\n,;]+/)
      .map(r => r.trim())
      .filter(r => r.includes('@'));

    if (recipientList.length === 0) {
      setErrorMsg(
        'Agrega al menos un correo destinatario antes de enviar.'
      );
      return;
    }

    setState('sending');
    try {
      const [year, month, day] = selectedDate.split('-');
      await sendViaGmail({
        to: recipientList,
        subject: `Reporte Diario — ${hub.name} — ${day}/${month}/${year}`,
        html: getEmailHtml(),
      });
      setState('sent');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar el reporte');
      setState('error');
    }
  };

  const dateLabel = report
    ? format(report.date, "EEEE d 'de' MMMM", { locale: es })
    : '';

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Reporte Diario — ${hub.name}`}
      size="xl"
    >
      <div className="space-y-4">

        {/* ── LOADING ── */}
        {state === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 text-gray-500">
            <ArrowPathIcon className="h-10 w-10 animate-spin text-blue-500" />
            <p>Generando reporte...</p>
          </div>
        )}

        {/* ── SENT ── */}
        {state === 'sent' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <CheckCircleIcon className="h-14 w-14 text-green-500" />
            <p className="text-lg font-semibold text-gray-900">
              Reporte enviado correctamente
            </p>
            <p className="text-sm text-gray-500">
              {recipients.split(/[\n,;]+/).filter(r => r.includes('@')).join(', ')}
            </p>
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        )}

        {/* ── ERROR ── */}
        {state === 'error' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6 space-y-2">
              <ExclamationCircleIcon className="h-12 w-12 text-red-500" />
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="secondary" onClick={onClose}>Cancelar</Button>
              <Button onClick={() => loadReport(new Date(selectedDate + 'T12:00:00'))}>
                Reintentar
              </Button>
            </div>
          </div>
        )}

        {/* ── PREVIEW / SENDING ── */}
        {(state === 'preview' || state === 'sending') && report && (
          <>
            {/* Controls row */}
            <div className="flex flex-wrap items-end gap-4 pb-2 border-b border-gray-200">
              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Fecha del reporte
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setSelectedDate(e.target.value)}
                  disabled={state === 'sending'}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Summary chips */}
              <div className="flex gap-2 text-xs font-medium">
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  {report.totalUsers} empleados
                </span>
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">
                  {report.onTimeCount} a tiempo
                </span>
                {report.summary.lateCount > 0 && (
                  <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                    {report.summary.lateCount} retrasos
                  </span>
                )}
                {report.summary.absentCount > 0 && (
                  <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">
                    {report.summary.absentCount} faltas
                  </span>
                )}
              </div>
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Destinatarios{' '}
                <span className="text-gray-400">(uno por línea o separados por coma)</span>
              </label>
              <textarea
                rows={2}
                value={recipients}
                onChange={e => setRecipients(e.target.value)}
                disabled={state === 'sending'}
                placeholder="correo@ejemplo.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500">
                  Notas adicionales (opcional)
                </label>
                <button
                  type="button"
                  onClick={() => setEditingNotes(v => !v)}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <PencilIcon className="h-3 w-3" />
                  {editingNotes ? 'Ocultar' : 'Agregar nota'}
                </button>
              </div>
              {editingNotes && (
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  disabled={state === 'sending'}
                  placeholder="Agrega contexto, justificaciones o aclaraciones que se incluirán en el correo..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Email preview */}
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-gray-500">
                <EnvelopeIcon className="h-4 w-4" />
                Vista previa del correo
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <iframe
                  title="Vista previa del reporte"
                  className="w-full"
                  style={{ height: '480px', border: 'none' }}
                  srcDoc={getEmailHtml()}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={state === 'sending'}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={state === 'sending'}
                leftIcon={
                  state === 'sending'
                    ? <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    : <PaperAirplaneIcon className="h-4 w-4" />
                }
              >
                {state === 'sending' ? 'Autoriza en el popup de Google...' : 'Enviar reporte'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
