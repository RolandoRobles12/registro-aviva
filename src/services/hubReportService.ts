// src/services/hubReportService.ts
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Hub, User, CheckIn, AttendanceIssue } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface LateEntry {
  userId: string;
  userName: string;
  kioskName: string;
  checkInTime: string;
  minutesLate: number;
}

export interface Absence {
  userId: string;
  userName: string;
  kioskName: string;
  type: 'no_entry' | 'no_exit' | 'no_lunch_return';
  typeLabel: string;
}

export interface HubDailyReport {
  hub: Hub;
  date: Date;
  lateEntries: LateEntry[];
  absences: Absence[];
  totalUsers: number;
  onTimeCount: number;
  summary: {
    lateCount: number;
    absentCount: number;
    punctualityRate: number;
  };
}

const ABSENCE_TYPE_LABELS: Record<string, string> = {
  no_entry: 'Sin entrada',
  no_exit: 'Sin salida',
  no_lunch_return: 'Sin regreso de comida',
};

// Firestore `in` queries support max 10 values
async function batchQuery<T>(
  ids: string[],
  buildQuery: (batch: string[]) => ReturnType<typeof query>
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    const snap = await getDocs(buildQuery(batch));
    snap.docs.forEach(d => results.push({ id: d.id, ...d.data() } as T));
  }
  return results;
}

export class HubReportService {
  static async getDailyReport(hub: Hub, date: Date): Promise<HubDailyReport> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Usuarios activos asignados al hub
    const usersSnap = await getDocs(
      query(
        collection(db, 'users'),
        where('hubId', '==', hub.id),
        where('status', '==', 'active')
      )
    );
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
    const userIds = users.map(u => u.id);

    if (userIds.length === 0) {
      return {
        hub,
        date,
        lateEntries: [],
        absences: [],
        totalUsers: 0,
        onTimeCount: 0,
        summary: { lateCount: 0, absentCount: 0, punctualityRate: 100 },
      };
    }

    // 2. Check-ins de entrada del día (filtramos retrasados en JS para evitar
    //    índices compuestos complejos en Firestore)
    const allCheckIns = await batchQuery<CheckIn>(userIds, batch =>
      query(
        collection(db, 'checkins'),
        where('userId', 'in', batch),
        where('type', '==', 'entrada'),
        where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
        where('timestamp', '<=', Timestamp.fromDate(endOfDay))
      )
    );
    const lateCheckIns = allCheckIns.filter(ci => ci.status === 'retrasado');

    const lateEntries: LateEntry[] = lateCheckIns
      .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis())
      .map(ci => ({
        userId: ci.userId,
        userName: ci.userName,
        kioskName: ci.kioskName,
        checkInTime: format(ci.timestamp.toDate(), 'HH:mm'),
        minutesLate: ci.validationResults?.minutesLate ?? 0,
      }));

    // 3. Problemas de asistencia del día (filtramos resolved en JS)
    const issues = await batchQuery<AttendanceIssue>(userIds, batch =>
      query(
        collection(db, 'attendance_issues'),
        where('userId', 'in', batch),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      )
    ).then(all => all.filter(i => !i.resolved));

    const absences: Absence[] = issues.map(issue => ({
      userId: issue.userId,
      userName: issue.userName,
      kioskName: issue.kioskName ?? '',
      type: issue.type,
      typeLabel: ABSENCE_TYPE_LABELS[issue.type] ?? issue.type,
    }));

    // 4. Calcular resumen
    const lateUserIds = new Set(lateEntries.map(e => e.userId));
    const absentUserIds = new Set(
      absences.filter(a => a.type === 'no_entry').map(a => a.userId)
    );
    const onTimeCount = users.filter(
      u => !lateUserIds.has(u.id) && !absentUserIds.has(u.id)
    ).length;

    const lateCount = lateUserIds.size;
    const absentCount = absentUserIds.size;
    const punctualityRate =
      users.length > 0
        ? Math.round((onTimeCount / users.length) * 100)
        : 100;

    return {
      hub,
      date,
      lateEntries,
      absences,
      totalUsers: users.length,
      onTimeCount,
      summary: { lateCount, absentCount, punctualityRate },
    };
  }

  /**
   * Genera el HTML del correo. Se usa tanto para la vista previa
   * como para el cuerpo del email enviado por la Cloud Function.
   */
  static buildEmailHtml(report: HubDailyReport, notes?: string): string {
    const dateStr = format(report.date, "EEEE d 'de' MMMM yyyy", { locale: es });
    const dateStrCap = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    const punctualityColor =
      report.summary.punctualityRate >= 90
        ? '#16a34a'
        : report.summary.punctualityRate >= 70
        ? '#ca8a04'
        : '#dc2626';

    const lateRows = report.lateEntries
      .map(
        e => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${e.userName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${e.kioskName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${e.checkInTime}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#ca8a04;font-weight:600;">${e.minutesLate} min</td>
        </tr>`
      )
      .join('');

    const absenceRows = report.absences
      .map(
        a => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${a.userName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${a.kioskName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#dc2626;">${a.typeLabel}</td>
        </tr>`
      )
      .join('');

    const lateSection =
      report.lateEntries.length > 0
        ? `
        <h3 style="color:#92400e;margin:24px 0 8px;">Retrasos (${report.lateEntries.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#fef3c7;">
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fbbf24;">Empleado</th>
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fbbf24;">Kiosko</th>
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fbbf24;">Hora entrada</th>
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fbbf24;">Retraso</th>
            </tr>
          </thead>
          <tbody>${lateRows}</tbody>
        </table>`
        : '';

    const absenceSection =
      report.absences.length > 0
        ? `
        <h3 style="color:#991b1b;margin:24px 0 8px;">Faltas (${report.absences.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#fee2e2;">
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fca5a5;">Empleado</th>
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fca5a5;">Kiosko</th>
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #fca5a5;">Tipo</th>
            </tr>
          </thead>
          <tbody>${absenceRows}</tbody>
        </table>`
        : '';

    const allOnTime =
      report.lateEntries.length === 0 && report.absences.length === 0;
    const noIssuesSection = allOnTime
      ? `<p style="color:#16a34a;font-weight:600;margin:16px 0;">
           ✅ Sin retrasos ni faltas — todos a tiempo.
         </p>`
      : '';

    const notesSection = notes
      ? `<div style="margin-top:24px;padding:16px;background:#f9fafb;border-left:4px solid #6b7280;border-radius:4px;">
           <strong>Notas:</strong><br/><span style="white-space:pre-wrap;">${notes}</span>
         </div>`
      : '';

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <!-- Header -->
    <tr>
      <td style="background:#1e40af;padding:24px 32px;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;">Reporte Diario de Asistencia</h1>
        <p style="margin:4px 0 0;color:#bfdbfe;font-size:14px;">${report.hub.name} — ${dateStrCap}</p>
      </td>
    </tr>
    <!-- Summary -->
    <tr>
      <td style="padding:24px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align:center;padding:16px;background:#f0f9ff;border-radius:8px;width:25%;">
              <div style="font-size:28px;font-weight:700;color:#1e40af;">${report.totalUsers}</div>
              <div style="font-size:12px;color:#64748b;">Total empleados</div>
            </td>
            <td style="width:4%"></td>
            <td style="text-align:center;padding:16px;background:#f0fdf4;border-radius:8px;width:25%;">
              <div style="font-size:28px;font-weight:700;color:#16a34a;">${report.onTimeCount}</div>
              <div style="font-size:12px;color:#64748b;">A tiempo</div>
            </td>
            <td style="width:4%"></td>
            <td style="text-align:center;padding:16px;background:#fffbeb;border-radius:8px;width:25%;">
              <div style="font-size:28px;font-weight:700;color:#ca8a04;">${report.summary.lateCount}</div>
              <div style="font-size:12px;color:#64748b;">Retrasos</div>
            </td>
            <td style="width:4%"></td>
            <td style="text-align:center;padding:16px;background:#fef2f2;border-radius:8px;width:25%;">
              <div style="font-size:28px;font-weight:700;color:#dc2626;">${report.summary.absentCount}</div>
              <div style="font-size:12px;color:#64748b;">Faltas</div>
            </td>
          </tr>
        </table>
        <div style="margin-top:16px;text-align:center;">
          <span style="font-size:16px;font-weight:700;color:${punctualityColor};">
            Puntualidad: ${report.summary.punctualityRate}%
          </span>
        </div>

        ${noIssuesSection}
        ${lateSection}
        ${absenceSection}
        ${notesSection}
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
        Registro Aviva — Reporte generado automáticamente
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
