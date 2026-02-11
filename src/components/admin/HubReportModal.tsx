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
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Modal, Button } from '../ui';
import { Hub } from '../../types';
import { HubReportService, HubDailyReport, LateEntry, Absence } from '../../services/hubReportService';
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
  const [recipients, setRecipients] = useState<string[]>(hub.reportEmails ?? []);
  const [newRecipient, setNewRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState(
    `Reporte Diario — ${hub.name} — ${format(new Date(), 'dd/MM/yyyy')}`
  );
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estado editable de incidencias (para revisión antes de enviar)
  const [editedLateEntries, setEditedLateEntries] = useState<LateEntry[]>([]);
  const [editedAbsences, setEditedAbsences] = useState<Absence[]>([]);

  useEffect(() => {
    loadReport(new Date(selectedDate + 'T12:00:00'));
  }, [selectedDate]);

  // Sincronizar edición cuando llega el reporte
  useEffect(() => {
    if (report) {
      setEditedLateEntries(report.lateEntries);
      setEditedAbsences(report.absences);
    }
  }, [report]);

  // Actualizar asunto cuando cambia la fecha
  useEffect(() => {
    const [year, month, day] = selectedDate.split('-');
    setEmailSubject(`Reporte Diario — ${hub.name} — ${day}/${month}/${year}`);
  }, [selectedDate]);

  const addRecipient = () => {
    const trimmed = newRecipient.trim();
    if (!trimmed.includes('@') || recipients.includes(trimmed)) return;
    setRecipients(prev => [...prev, trimmed]);
    setNewRecipient('');
  };

  const removeRecipient = (idx: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== idx));
  };

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

  // Construye el reporte con las incidencias editadas y recalcula el resumen
  const getEditedReport = (): HubDailyReport | null => {
    if (!report) return null;
    const lateUserIds = new Set(editedLateEntries.map(e => e.userId));
    const absentUserIds = new Set(
      editedAbsences.filter(a => a.type === 'no_entry').map(a => a.userId)
    );
    const onTimeCount = Math.max(
      0,
      report.totalUsers - lateUserIds.size - absentUserIds.size
    );
    return {
      ...report,
      lateEntries: editedLateEntries,
      absences: editedAbsences,
      onTimeCount,
      summary: {
        lateCount: lateUserIds.size,
        absentCount: absentUserIds.size,
        punctualityRate:
          report.totalUsers > 0
            ? Math.round((onTimeCount / report.totalUsers) * 100)
            : 100,
      },
    };
  };

  const getEmailHtml = () => {
    const edited = getEditedReport();
    return edited ? HubReportService.buildEmailHtml(edited, notes || undefined) : '';
  };

  const handleSend = async () => {
    const recipientList = recipients.filter(r => r.includes('@'));

    if (recipientList.length === 0) {
      setErrorMsg('Agrega al menos un correo destinatario antes de enviar.');
      return;
    }

    setState('sending');
    try {
      await sendViaGmail({
        to: recipientList,
        subject: emailSubject,
        html: getEmailHtml(),
      });
      setState('sent');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar el reporte');
      setState('error');
    }
  };

  const editedReport = getEditedReport();
  const hasIncidencias =
    editedLateEntries.length > 0 || editedAbsences.length > 0;

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
            <ArrowPathIcon className="h-10 w-10 animate-spin text-primary-600" />
            <p>Generando reporte...</p>
          </div>
        )}

        {/* ── SENT ── */}
        {state === 'sent' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <CheckCircleIcon className="h-14 w-14 text-primary-600" />
            <p className="text-lg font-semibold text-gray-900">
              Reporte enviado correctamente
            </p>
            <p className="text-sm text-gray-500">
              {recipients.join(', ')}
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
        {(state === 'preview' || state === 'sending') && report && editedReport && (
          <>
            {/* Controls row */}
            <div className="flex flex-wrap items-end gap-4 pb-2 border-b border-gray-200">
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
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-2 text-xs font-medium">
                <span className="px-2 py-1 rounded-full bg-primary-50 text-primary-700">
                  {editedReport.totalUsers} empleados
                </span>
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">
                  {editedReport.onTimeCount} a tiempo
                </span>
                {editedReport.summary.lateCount > 0 && (
                  <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                    {editedReport.summary.lateCount} retrasos
                  </span>
                )}
                {editedReport.summary.absentCount > 0 && (
                  <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">
                    {editedReport.summary.absentCount} faltas
                  </span>
                )}
              </div>
            </div>

            {/* ── Verificación de incidencias (editable) ── */}
            {hasIncidencias && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">
                    Verificar incidencias antes de enviar
                  </p>
                  <p className="text-xs text-gray-400">
                    Elimina registros incorrectos con el icono de la fila
                  </p>
                </div>

                {/* Retrasos */}
                {editedLateEntries.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-amber-700 mb-2">
                      Retrasos ({editedLateEntries.length})
                    </p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-100">
                          <th className="text-left py-1 pr-3 font-medium">Colaborador</th>
                          <th className="text-left py-1 pr-3 font-medium">Tienda</th>
                          <th className="text-left py-1 pr-3 font-medium">Hora entrada</th>
                          <th className="text-left py-1 pr-3 font-medium">Retraso</th>
                          <th className="w-6"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {editedLateEntries.map((entry, i) => (
                          <tr
                            key={`late-${entry.userId}-${i}`}
                            className="border-t border-gray-100 hover:bg-amber-50"
                          >
                            <td className="py-1.5 pr-3 font-medium text-gray-900">
                              {entry.userName}
                            </td>
                            <td className="py-1.5 pr-3 text-gray-600">{entry.kioskName}</td>
                            <td className="py-1.5 pr-3 text-gray-700">{entry.checkInTime}</td>
                            <td className="py-1.5 pr-3 font-semibold text-amber-700">
                              {entry.minutesLate} min
                            </td>
                            <td className="py-1.5 text-right">
                              <button
                                onClick={() =>
                                  setEditedLateEntries(prev =>
                                    prev.filter((_, idx) => idx !== i)
                                  )
                                }
                                disabled={state === 'sending'}
                                className="text-gray-300 hover:text-red-500 disabled:opacity-30"
                                title="Eliminar esta incidencia del reporte"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Faltas */}
                {editedAbsences.length > 0 && (
                  <div
                    className={`px-4 py-3 ${
                      editedLateEntries.length > 0 ? 'border-t border-gray-200' : ''
                    }`}
                  >
                    <p className="text-xs font-semibold text-red-700 mb-2">
                      Faltas ({editedAbsences.length})
                    </p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-100">
                          <th className="text-left py-1 pr-3 font-medium">Colaborador</th>
                          <th className="text-left py-1 pr-3 font-medium">Tienda</th>
                          <th className="text-left py-1 pr-3 font-medium">Tipo</th>
                          <th className="w-6"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {editedAbsences.map((absence, i) => (
                          <tr
                            key={`abs-${absence.userId}-${absence.type}-${i}`}
                            className="border-t border-gray-100 hover:bg-red-50"
                          >
                            <td className="py-1.5 pr-3 font-medium text-gray-900">
                              {absence.userName}
                            </td>
                            <td className="py-1.5 pr-3 text-gray-600">{absence.kioskName}</td>
                            <td className="py-1.5 pr-3 text-red-700">{absence.typeLabel}</td>
                            <td className="py-1.5 text-right">
                              <button
                                onClick={() =>
                                  setEditedAbsences(prev =>
                                    prev.filter((_, idx) => idx !== i)
                                  )
                                }
                                disabled={state === 'sending'}
                                className="text-gray-300 hover:text-red-500 disabled:opacity-30"
                                title="Eliminar esta incidencia del reporte"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Asunto del correo
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                disabled={state === 'sending'}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Destinatarios
              </label>

              {/* Chips de correos actuales */}
              <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                {recipients.length === 0 && (
                  <span className="text-xs text-gray-400 italic">
                    Sin destinatarios — agrega al menos uno antes de enviar
                  </span>
                )}
                {recipients.map((email, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full bg-primary-50 text-primary-700 text-xs font-medium border border-primary-200"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeRecipient(idx)}
                      disabled={state === 'sending'}
                      className="ml-0.5 text-primary-400 hover:text-primary-700 disabled:opacity-30 leading-none"
                      title="Quitar destinatario"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Agregar nuevo correo */}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newRecipient}
                  onChange={e => setNewRecipient(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); addRecipient(); }
                  }}
                  disabled={state === 'sending'}
                  placeholder="correo@ejemplo.com"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={addRecipient}
                  disabled={state === 'sending' || !newRecipient.includes('@')}
                  className="px-3 py-1.5 text-sm rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Agregar
                </button>
              </div>
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
                  className="text-xs text-primary-600 hover:underline flex items-center gap-1"
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
                  placeholder="Contexto, justificaciones o aclaraciones que se incluirán en el correo..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
