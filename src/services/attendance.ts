// src/services/attendance.ts - NUEVO ARCHIVO COMPLETO
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
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ScheduleService } from './schedules';
import { AttendanceIssue, AttendanceStats, User, CheckIn, ProductType } from '../types';

export class AttendanceService {
  /**
   * Check for missing check-ins (run this periodically)
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
        
        // Check for missing entry (1 hour after expected entry time)
        const [entryHours, entryMinutes] = schedule.schedule.entryTime.split(':').map(Number);
        const expectedEntry = new Date(today);
        expectedEntry.setHours(entryHours, entryMinutes, 0, 0);
        const entryDeadline = new Date(expectedEntry.getTime() + 60 * 60 * 1000); // +1 hour
        
        if (now > entryDeadline && !checkIns.find(c => c.type === 'entrada')) {
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
            resolved: false
          });
        }
        
        // Check for missing exit (1 hour after expected exit time)
        const [exitHours, exitMinutes] = schedule.schedule.exitTime.split(':').map(Number);
        const expectedExit = new Date(today);
        expectedExit.setHours(exitHours, exitMinutes, 0, 0);
        const exitDeadline = new Date(expectedExit.getTime() + 60 * 60 * 1000); // +1 hour
        
        if (now > exitDeadline && 
            checkIns.find(c => c.type === 'entrada') && 
            !checkIns.find(c => c.type === 'salida')) {
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
            resolved: false
          });
        }
        
        // Check for missing lunch return
        const lunchCheckIn = checkIns.find(c => c.type === 'comida');
        if (lunchCheckIn) {
          const lunchTime = lunchCheckIn.timestamp.toDate();
          const expectedReturn = new Date(lunchTime.getTime() + schedule.schedule.lunchDuration * 60 * 1000);
          const returnDeadline = new Date(expectedReturn.getTime() + 30 * 60 * 1000); // +30 min grace
          
          if (now > returnDeadline && !checkIns.find(c => c.type === 'regreso_comida')) {
            issues.push({
              id: '',
              userId: userDoc.id,
              userName: user.name,
              kioskId: user.assignedKiosk,
              kioskName: user.assignedKioskName,
              productType: user.productType,
              type: 'no_lunch_return',
              expectedTime: `${expectedReturn.getHours()}:${expectedReturn.getMinutes().toString().padStart(2, '0')}`,
              detectedAt: Timestamp.now(),
              date: Timestamp.fromDate(today),
              resolved: false
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
        }
      }

      return issues;
    } catch (error) {
      console.error('Error detecting missing check-ins:', error);
      return [];
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
}