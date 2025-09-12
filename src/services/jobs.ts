// ACTUALIZAR src/services/jobs.ts

import { AttendanceService } from './attendance';
import { FirestoreService } from './firestore';

export class JobService {
  private static interval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Start background jobs con intervalos configurables
   */
  static async startBackgroundJobs() {
    if (this.isRunning) {
      console.log('Background jobs already running');
      return;
    }

    this.isRunning = true;
    
    // ✅ OBTENER INTERVALO DESDE CONFIGURACIÓN
    const config = await FirestoreService.getSystemConfig('global');
    const checkIntervalMinutes = config?.jobSettings?.checkIntervalMinutes || 30;
    
    // Run every X minutes (configurable)
    this.interval = setInterval(async () => {
      await this.runAttendanceCheck();
    }, checkIntervalMinutes * 60 * 1000);

    // Run immediately on start
    this.runAttendanceCheck();
    
    console.log(`✅ Background jobs started (interval: ${checkIntervalMinutes} minutes)`);
  }

  /**
   * Stop background jobs
   */
  static stopBackgroundJobs() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.isRunning = false;
      console.log('Background jobs stopped');
    }
  }

  /**
   * Run attendance check usando reglas configuradas
   */
  static async runAttendanceCheck() {
    try {
      console.log('🔍 Running attendance check with dynamic rules...');
      
      // ✅ DETECTAR AUSENCIAS CON REGLAS DINÁMICAS
      const issues = await AttendanceService.detectMissingCheckIns();
      console.log(`Found ${issues.length} attendance issues`);
      
      if (issues.length > 0) {
        // ✅ ENVIAR NOTIFICACIONES SOLO SI ESTÁ CONFIGURADO
        const config = await FirestoreService.getSystemConfig('global');
        
        if (config?.notificationRules?.notifyOnAbsence) {
          console.log('📧 Sending absence notifications...');
          
          // Agrupar por tipo de issue para notificaciones más organizadas
          const groupedIssues = this.groupIssuesByType(issues);
          
          for (const [type, typeIssues] of Object.entries(groupedIssues)) {
            await this.sendGroupedNotification(type, typeIssues);
          }
        }
        
        // ✅ APLICAR CIERRES AUTOMÁTICOS SI ESTÁ CONFIGURADO
        if (config?.autoCloseRules?.markAsAbsent) {
          const autoCloseIssues = issues.filter(i => i.type === 'no_exit');
          
          for (const issue of autoCloseIssues) {
            await AttendanceService.applyAutoClose(issue.userId, issue.expectedTime);
          }
          
          console.log(`🔒 Applied auto-close to ${autoCloseIssues.length} users`);
        }
      }
    } catch (error) {
      console.error('Error in attendance check job:', error);
    }
  }

  /**
   * ✅ NUEVO: Agrupar issues por tipo para notificaciones organizadas
   */
  private static groupIssuesByType(issues: any[]): Record<string, any[]> {
    return issues.reduce((acc, issue) => {
      if (!acc[issue.type]) {
        acc[issue.type] = [];
      }
      acc[issue.type].push(issue);
      return acc;
    }, {} as Record<string, any[]>);
  }

  /**
   * ✅ NUEVO: Enviar notificaciones agrupadas
   */
  private static async sendGroupedNotification(type: string, issues: any[]): Promise<void> {
    try {
      const typeLabels = {
        no_entry: '🚨 Ausencias de Entrada',
        no_exit: '⏰ Ausencias de Salida', 
        late_lunch_return: '🍽️ Retrasos de Comida',
        auto_closed: '🔒 Cierres Automáticos'
      };
      
      const title = typeLabels[type as keyof typeof typeLabels] || '📊 Issues de Asistencia';
      
      console.log(`📧 ${title}: ${issues.length} casos`);
      issues.forEach(issue => {
        console.log(`   - ${issue.userName}: ${issue.ruleTriggered} (${issue.minutesLate} min tarde)`);
      });
      
      // TODO: Implementar envío real de notificaciones
      // - Email a administradores
      // - Slack channel notifications
      // - Push notifications
      // - Dashboard alerts
    } catch (error) {
      console.error('Error sending grouped notification:', error);
    }
  }

  /**
   * Run manual attendance check
   */
  static async runManualCheck(): Promise<number> {
    try {
      console.log('🔍 Running manual attendance check...');
      const issues = await AttendanceService.detectMissingCheckIns();
      console.log(`✅ Manual check completed: ${issues.length} issues found`);
      return issues.length;
    } catch (error) {
      console.error('Error in manual attendance check:', error);
      return 0;
    }
  }

  /**
   * ✅ NUEVO: Get job configuration status
   */
  static async getJobStatus(): Promise<{
    isRunning: boolean;
    intervalMinutes: number;
    lastRunTime?: Date;
    nextRunTime?: Date;
  }> {
    const config = await FirestoreService.getSystemConfig('global');
    const intervalMinutes = config?.jobSettings?.checkIntervalMinutes || 30;
    
    return {
      isRunning: this.isRunning,
      intervalMinutes,
      // TODO: Implementar tracking de última ejecución
    };
  }
}