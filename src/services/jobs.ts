// src/services/jobs.ts - NUEVO ARCHIVO COMPLETO
import { AttendanceService } from './attendance';

export class JobService {
  private static interval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Start background jobs
   */
  static startBackgroundJobs() {
    if (this.isRunning) {
      console.log('Background jobs already running');
      return;
    }

    this.isRunning = true;
    
    // Run every 30 minutes
    this.interval = setInterval(async () => {
      await this.runAttendanceCheck();
    }, 30 * 60 * 1000); // 30 minutes

    // Run immediately on start
    this.runAttendanceCheck();
    
    console.log('Background jobs started');
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
   * Run attendance check
   */
  static async runAttendanceCheck() {
    try {
      console.log('Running attendance check...');
      const issues = await AttendanceService.detectMissingCheckIns();
      console.log(`Found ${issues.length} attendance issues`);
      
      // You can add notifications here
      if (issues.length > 0) {
        // Send notifications to supervisors/admins
        // This could be email, Slack, push notifications, etc.
        console.log('New attendance issues detected:', issues);
      }
    } catch (error) {
      console.error('Error in attendance check job:', error);
    }
  }

  /**
   * Run manual attendance check
   */
  static async runManualCheck(): Promise<number> {
    try {
      const issues = await AttendanceService.detectMissingCheckIns();
      return issues.length;
    } catch (error) {
      console.error('Error in manual attendance check:', error);
      return 0;
    }
  }
}