// src/services/attendance.ts - ARCHIVO COMPLETO CON REGLAS DINÁMICAS
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp, 
  addDoc, 
  serverTimestamp,
  updateDoc,
  doc,
  orderBy,
  limit,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ScheduleService } from './schedules';
import { FirestoreService } from './firestore';
import { AttendanceIssue, AttendanceStats, User, CheckIn, ProductType } from '../types';

export class AttendanceService {
  /**
   * Check for missing check-ins usando configuración dinámica
   */
  static async detectMissingCheckIns(): Promise<AttendanceIssue[]> {
    const issues: AttendanceIssue[] = [];
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Get all active users with assigned kiosks
      const usersSnapshot = await getDocs(
        query(
          collection(db, 'users'), 
          where('status', '==', 'active')
        )
      );
      
      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data() as User;
        
        // Skip users without assigned product type
        if (!user.productType) continue;
        
        // Check if today is a work day for this product
        const isWorkDay = await ScheduleService.isWorkDay(user.productType);
        if (!isWorkDay) continue;
        
        // ✅ OBTENER CONFIGURACIÓN DINÁMICA (no constantes)
        const globalConfig = await FirestoreService.getSystemConfig('global');
        const productConfig = await FirestoreService.getSystemConfig(user.productType);
        
        // Usar configuración específica del producto o global como fallback
        const config = productConfig || globalConfig;
        
        if (!config) {
          console.warn(`No config found for product ${user.productType}`);
          continue;
        }
        
        // Get schedule for product
        const schedule = await ScheduleService.getProductSchedule(user.productType);
        if (!schedule) continue;
        
        // Get today's check-ins for this user
        const checkInsQuery = query(
          collection(db, 'checkins'),
          where('userId', '==', userDoc.id),
          where('timestamp', '>=', Timestamp.fromDate(today)),
          orderBy('timestamp', 'asc')
        );
        const checkInsSnapshot = await getDocs(checkInsQuery);
        const checkIns = checkInsSnapshot.docs.map(d => d.data() as CheckIn);
        
        // ✅ USAR REGLAS CONFIGURADAS DINÁMICAMENTE
        const entryGraceMinutes = config.absenceRules?.noEntryAfterMinutes || 60;
        const exitGraceMinutes = config.absenceRules?.noExitAfterMinutes || 120;
        const autoCloseMinutes = config.autoCloseRules?.closeAfterMinutes || 60;
        const maxLunchMinutes = config.lunchRules?.maxDurationMinutes || 90;
        
        // Check for missing entry usando configuración dinámica
        const [entryHours, entryMinutes] = schedule.schedule.entryTime.split(':').map(Number);
        const expectedEntry = new Date(today);
        expectedEntry.setHours(entryHours, entryMinutes, 0, 0);
        const entryDeadline = new Date(expectedEntry.getTime() + entryGraceMinutes * 60 * 1000);
        
        if (now > entryDeadline && !checkIns.find(c => c.type === 'entrada')) {
          const minutesLate = Math.floor((now.getTime() - entryDeadline.getTime()) / (60 * 1000));
          
          issues.push({
            id: '',
            userId: userDoc.id,
            userName: user.name,
            kioskId: user.assignedKiosk,
            kioskName: user.assignedKioskName,
            productType: user.productType,
            type: 'no_entry',
            expectedTime: schedule.schedule.entryTime,
            detectedAt: Timestamp.now(),
            date: Timestamp.fromDate(today),
            resolved: false,
            ruleTriggered: `Entrada requerida antes de ${entryGraceMinutes} minutos`,
            minutesLate: minutesLate
          });
        }
        
        // Check for missing exit usando configuración dinámica
        const [exitHours, exitMinutes] = schedule.schedule.exitTime.split(':').map(Number);
        const expectedExit = new Date(today);
        expectedExit.setHours(exitHours, exitMinutes, 0, 0);
        const exitDeadline = new Date(expectedExit.getTime() + exitGraceMinutes * 60 * 1000);
        
        if (now > exitDeadline && 
            checkIns.find(c => c.type === 'entrada') && 
            !checkIns.find(c => c.type === 'salida')) {
          
          const minutesLate = Math.floor((now.getTime() - exitDeadline.getTime()) / (60 * 1000));
          
          issues.push({
            id: '',
            userId: userDoc.id,
            userName: user.name,
            kioskId: user.assignedKiosk,
            kioskName: user.assignedKioskName,
            productType: user.productType,
            type: 'no_exit',
            expectedTime: schedule.schedule.exitTime,
            detectedAt: Timestamp.now(),
            date: Timestamp.fromDate(today),
            resolved: false,
            ruleTriggered: `Salida requerida antes de ${exitGraceMinutes} minutos`,
            minutesLate: minutesLate
          });
        }
        
        // ✅ NUEVA: Check for auto-close usando configuración
        if (config.autoCloseRules?.markAsAbsent) {
          const autoCloseDeadline = new Date(expectedExit.getTime() + autoCloseMinutes * 60 * 1000);
          
          if (now > autoCloseDeadline && 
              checkIns.find(c => c.type === 'entrada') && 
              !checkIns.find(c => c.type === 'salida')) {
            
            const minutesOverdue = Math.floor((now.getTime() - autoCloseDeadline.getTime()) / (60 * 1000));
            
            issues.push({
              id: '',
              userId: userDoc.id,
              userName: user.name,
              kioskId: user.assignedKiosk,
              kioskName: user.assignedKioskName,
              productType: user.productType,
              type: 'auto_closed',
              expectedTime: schedule.schedule.exitTime,
              detectedAt: Timestamp.now(),
              date: Timestamp.fromDate(today),
              resolved: false,
              ruleTriggered: `Cierre automático después de ${autoCloseMinutes} minutos`,
              minutesLate: minutesOverdue
            });
          }
        }
        
        // ✅ NUEVA: Check for excessive lunch time usando configuración
        const lunchCheckIn = checkIns.find(c => c.type === 'comida');
        const lunchReturn = checkIns.find(c => c.type === 'regreso_comida');
        
        if (lunchCheckIn && !lunchReturn) {
          const lunchTime = lunchCheckIn.timestamp.toDate();
          const maxLunchDeadline = new Date(lunchTime.getTime() + maxLunchMinutes * 60 * 1000);
          
          if (now > maxLunchDeadline) {
            const minutesOverdue = Math.floor((now.getTime() - maxLunchDeadline.getTime()) / (60 * 1000));
            
            issues.push({
              id: '',
              userId: userDoc.id,
              userName: user.name,
              kioskId: user.assignedKiosk,
              kioskName: user.assignedKioskName,
              productType: user.productType,
              type: 'late_lunch_return',
              expectedTime: `${Math.floor(maxLunchDeadline.getHours())}:${maxLunchDeadline.getMinutes().toString().padStart(2, '0')}`,
              detectedAt: Timestamp.now(),
              date: Timestamp.fromDate(today),
              resolved: false,
              ruleTriggered: `Regreso de comida requerido antes de ${maxLunchMinutes} minutos`,
              minutesLate: minutesOverdue
            });
          }
        }
      }

      // Save detected issues to database
      for (const issue of issues) {
        // Check if issue already exists
        const existingQuery = query(
          collection(db, 'attendance_issues'),
          where('userId', '==', issue.userId),
          where('type', '==', issue.type),
          where('date', '==', issue.date),
          where('resolved', '==', false)
        );
        const existing = await getDocs(existingQuery);
        
        if (existing.empty) {
          const docRef = await addDoc(collection(db, 'attendance_issues'), {
            ...issue,
            createdAt: serverTimestamp()
          });
          issue.id = docRef.id;
          
          // ✅ NUEVA: Enviar notificaciones si está configurado
          const globalConfig = await FirestoreService.getSystemConfig('global');
          if (globalConfig?.notificationRules?.notifyOnAbsence) {
            await this.sendAbsenceNotification(issue);
          }
        }
      }

      return issues;
    } catch (error) {
      console.error('Error detecting missing check-ins:', error);
      return [];
    }
  }

  /**
   * ✅ NUEVO: Enviar notificaciones de ausencias
   */
  static async sendAbsenceNotification(issue: AttendanceIssue): Promise<void> {
    try {
      // TODO: Implementar notificaciones (email, Slack, etc.)
      console.log(`🚨 AUSENCIA DETECTADA: ${issue.userName} - ${issue.type} - ${issue.ruleTriggered}`);
      
      // Aquí puedes agregar:
      // - Envío de emails
      // - Notificaciones a Slack
      // - Push notifications
      // - SMS
      
      // Guardar notificación en base de datos para el dashboard
      await addDoc(collection(db, 'notifications'), {
        type: 'absence_alert',
        title: 'Ausencia Detectada',
        message: `${issue.userName} - ${issue.type}`,
        userId: issue.userId,
        issueId: issue.id,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending absence notification:', error);
    }
  }

  /**
   * ✅ NUEVO: Aplicar cierre automático
   */
  static async applyAutoClose(userId: string, expectedExitTime: string): Promise<void> {
    try {
      const config = await FirestoreService.getSystemConfig('global');
      
      if (config?.autoCloseRules?.markAsAbsent) {
        // Crear un check-in automático de salida
        const user = await FirestoreService.getDocument<User>('users', userId);
        if (!user) return;
        
        await addDoc(collection(db, 'checkins'), {
          userId,
          userName: user.name,
          type: 'salida',
          timestamp: serverTimestamp(),
          status: 'auto_closed',
          notes: 'Cierre automático aplicado por reglas del sistema',
          isAutoGenerated: true,
          validationResults: {
            locationValid: false,
            distanceFromKiosk: 0,
            isOnTime: false,
            minutesLate: 0,
            minutesEarly: 0,
            status: 'auto_closed'
          },
          createdAt: serverTimestamp()
        });
        
        console.log(`✅ Cierre automático aplicado para usuario: ${userId}`);
      }
    } catch (error) {
      console.error('Error applying auto-close:', error);
    }
  }

  /**
   * Get attendance issues
   */
  static async getAttendanceIssues(
    filters?: {
      date?: Date;
      resolved?: boolean;
      userId?: string;
      productType?: ProductType;
    }
  ): Promise<AttendanceIssue[]> {
    try {
      const constraints = [];
      
      if (filters?.date) {
        const startOfDay = new Date(filters.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filters.date);
        endOfDay.setHours(23, 59, 59, 999);
        
        constraints.push(
          where('date', '>=', Timestamp.fromDate(startOfDay)),
          where('date', '<=', Timestamp.fromDate(endOfDay))
        );
      }
      
      if (filters?.resolved !== undefined) {
        constraints.push(where('resolved', '==', filters.resolved));
      }
      
      if (filters?.userId) {
        constraints.push(where('userId', '==', filters.userId));
      }
      
      if (filters?.productType) {
        constraints.push(where('productType', '==', filters.productType));
      }
      
      const q = query(
        collection(db, 'attendance_issues'),
        ...constraints,
        orderBy('detectedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AttendanceIssue));
    } catch (error) {
      console.error('Error getting attendance issues:', error);
      return [];
    }
  }

  /**
   * Resolve attendance issue
   */
  static async resolveAttendanceIssue(
    issueId: string,
    resolvedBy: string,
    resolution: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'attendance_issues', issueId), {
        resolved: true,
        resolvedBy,
        resolvedAt: serverTimestamp(),
        resolution
      });
    } catch (error) {
      console.error('Error resolving attendance issue:', error);
      throw error;
    }
  }

  /**
   * Get attendance statistics
   */
  static async getAttendanceStats(dateRange?: { start: Date; end: Date }): Promise<AttendanceStats> {
    try {
      const start = dateRange?.start || new Date();
      start.setHours(0, 0, 0, 0);
      const end = dateRange?.end || new Date();
      end.setHours(23, 59, 59, 999);

      // Get all check-ins in range
      const checkInsQuery = query(
        collection(db, 'checkins'),
        where('timestamp', '>=', Timestamp.fromDate(start)),
        where('timestamp', '<=', Timestamp.fromDate(end)),
        where('type', '==', 'entrada')
      );
      const checkInsSnapshot = await getDocs(checkInsQuery);
      
      // Get all attendance issues in range
      const issuesQuery = query(
        collection(db, 'attendance_issues'),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end)),
        where('type', '==', 'no_entry'),
        where('resolved', '==', false)
      );
      const issuesSnapshot = await getDocs(issuesQuery);
      
      // Get all active users
      const usersQuery = query(
        collection(db, 'users'),
        where('status', '==', 'active')
      );
      const usersSnapshot = await getDocs(usersQuery);
      const totalUsers = usersSnapshot.size;
      
      // Calculate work days in range
      let workDays = 0;
      const current = new Date(start);
      while (current <= end) {
        // Simplified - check if it's not Sunday
        // In production, check each product's schedule
        if (current.getDay() !== 0) {
          workDays++;
        }
        current.setDate(current.getDate() + 1);
      }
      
      const totalExpected = totalUsers * workDays;
      const totalPresent = checkInsSnapshot.size;
      const totalAbsent = issuesSnapshot.size;
      
      // Count late and early check-ins
      let totalLate = 0;
      let totalEarly = 0;
      
      checkInsSnapshot.docs.forEach(doc => {
        const checkIn = doc.data() as CheckIn;
        if (checkIn.status === 'retrasado') {
          totalLate++;
        } else if (checkIn.status === 'anticipado') {
          totalEarly++;
        }
      });
      
      const totalOnTime = totalPresent - totalLate - totalEarly;
      
      return {
        totalExpected,
        totalPresent,
        totalAbsent,
        totalLate,
        totalEarly,
        attendanceRate: totalExpected > 0 ? (totalPresent / totalExpected) * 100 : 0,
        punctualityRate: totalPresent > 0 ? (totalOnTime / totalPresent) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting attendance stats:', error);
      return {
        totalExpected: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        totalEarly: 0,
        attendanceRate: 0,
        punctualityRate: 0
      };
    }
  }

  /**
   * Get department statistics
   */
  static async getDepartmentStats(dateRange?: { start: Date; end: Date }): Promise<any[]> {
    try {
      const start = dateRange?.start || new Date();
      start.setHours(0, 0, 0, 0);
      const end = dateRange?.end || new Date();
      end.setHours(23, 59, 59, 999);

      // Get all check-ins grouped by product type
      const productTypes: ProductType[] = ['BA', 'Aviva_Contigo', 'Casa_Marchand', 'Construrama', 'Disensa'];
      const stats = [];

      for (const productType of productTypes) {
        const checkInsQuery = query(
          collection(db, 'checkins'),
          where('productType', '==', productType),
          where('timestamp', '>=', Timestamp.fromDate(start)),
          where('timestamp', '<=', Timestamp.fromDate(end)),
          where('type', '==', 'entrada')
        );
        const checkInsSnapshot = await getDocs(checkInsQuery);
        
        const issuesQuery = query(
          collection(db, 'attendance_issues'),
          where('productType', '==', productType),
          where('date', '>=', Timestamp.fromDate(start)),
          where('date', '<=', Timestamp.fromDate(end)),
          where('type', '==', 'no_entry'),
          where('resolved', '==', false)
        );
        const issuesSnapshot = await getDocs(issuesQuery);
        
        // Get users for this product type
        const usersQuery = query(
          collection(db, 'users'),
          where('productType', '==', productType),
          where('status', '==', 'active')
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        const totalPresent = checkInsSnapshot.size;
        const totalAbsent = issuesSnapshot.size;
        const totalEmployees = usersSnapshot.size;
        
        let onTimeCount = 0;
        checkInsSnapshot.docs.forEach(doc => {
          const checkIn = doc.data() as CheckIn;
          if (checkIn.status === 'a_tiempo') {
            onTimeCount++;
          }
        });
        
        stats.push({
          department: productType,
          employees: totalEmployees,
          present: totalPresent,
          absent: totalAbsent,
          attendance: totalEmployees > 0 ? ((totalPresent / (totalPresent + totalAbsent)) * 100) : 0,
          punctuality: totalPresent > 0 ? ((onTimeCount / totalPresent) * 100) : 0
        });
      }

      return stats;
    } catch (error) {
      console.error('Error getting department stats:', error);
      return [];
    }
  }

  /**
   * ✅ NUEVO: Generar reporte de reglas aplicadas
   */
  static async getRulesReport(dateRange?: { start: Date; end: Date }): Promise<any> {
    try {
      const start = dateRange?.start || new Date();
      start.setHours(0, 0, 0, 0);
      const end = dateRange?.end || new Date();
      end.setHours(23, 59, 59, 999);

      const issuesQuery = query(
        collection(db, 'attendance_issues'),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end)),
        orderBy('date', 'desc')
      );
      
      const issuesSnapshot = await getDocs(issuesQuery);
      const issues = issuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Agrupar por tipo de regla
      const ruleStats = issues.reduce((acc, issue) => {
        const ruleType = issue.type;
        if (!acc[ruleType]) {
          acc[ruleType] = {
            count: 0,
            totalMinutesLate: 0,
            users: new Set()
          };
        }
        acc[ruleType].count++;
        acc[ruleType].totalMinutesLate += issue.minutesLate || 0;
        acc[ruleType].users.add(issue.userId);
        return acc;
      }, {} as Record<string, any>);
      
      // Convertir a formato legible
      const report = Object.entries(ruleStats).map(([ruleType, stats]) => ({
        ruleType,
        count: stats.count,
        averageMinutesLate: stats.count > 0 ? Math.round(stats.totalMinutesLate / stats.count) : 0,
        uniqueUsers: stats.users.size,
        label: {
          no_entry: 'Ausencias de Entrada',
          no_exit: 'Ausencias de Salida',
          late_lunch_return: 'Retrasos de Comida',
          auto_closed: 'Cierres Automáticos'
        }[ruleType] || ruleType
      }));
      
      return {
        totalIssues: issues.length,
        dateRange: { start, end },
        ruleBreakdown: report,
        rawIssues: issues
      };
    } catch (error) {
      console.error('Error generating rules report:', error);
      return { totalIssues: 0, ruleBreakdown: [], rawIssues: [] };
    }
  }

  /**
   * ✅ NUEVO: Test reglas de configuración
   */
  static async testConfigurationRules(productType?: ProductType): Promise<{
    isValid: boolean;
    warnings: string[];
    suggestions: string[];
  }> {
    try {
      const config = await FirestoreService.getSystemConfig(productType || 'global');
      const warnings: string[] = [];
      const suggestions: string[] = [];
      
      if (!config) {
        warnings.push('No hay configuración definida');
        return { isValid: false, warnings, suggestions };
      }
      
      // Validar rangos razonables
      if (config.absenceRules?.noEntryAfterMinutes && config.absenceRules.noEntryAfterMinutes > 240) {
        warnings.push('Tiempo de gracia para entrada muy alto (>4 horas)');
      }
      
      if (config.absenceRules?.noExitAfterMinutes && config.absenceRules.noExitAfterMinutes > 480) {
        warnings.push('Tiempo de gracia para salida muy alto (>8 horas)');
      }
      
      if (config.lunchRules?.maxDurationMinutes && config.lunchRules.maxDurationMinutes > 180) {
        warnings.push('Tiempo máximo de comida muy alto (>3 horas)');
        suggestions.push('Considera reducir el tiempo máximo de comida a 90-120 minutos');
      }
      
      // Validar consistencia
      if (config.autoCloseRules?.closeAfterMinutes && 
          config.absenceRules?.noExitAfterMinutes &&
          config.autoCloseRules.closeAfterMinutes < config.absenceRules.noExitAfterMinutes) {
        warnings.push('El cierre automático ocurre antes que la detección de ausencia por salida');
        suggestions.push('El cierre automático debería ocurrir después de la detección de ausencia');
      }
      
      return {
        isValid: warnings.length === 0,
        warnings,
        suggestions
      };
    } catch (error) {
      console.error('Error testing configuration rules:', error);
      return { 
        isValid: false, 
        warnings: ['Error validando configuración'], 
        suggestions: [] 
      };
    }
  }
}