// src/services/reportsService.ts - Service for generating and managing reports
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  CheckIn,
  User,
  Kiosk,
  Hub,
  AttendanceIssue,
  TimeOffRequest
} from '../types';

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  userIds?: string[];
  kioskIds?: string[];
  hubIds?: string[];
  productTypes?: string[];
  supervisorIds?: string[];
  checkInType?: 'entrada' | 'comida' | 'regreso_comida' | 'salida';
  status?: 'a_tiempo' | 'retrasado' | 'anticipado' | 'ubicacion_invalida' | 'auto_closed';
}

export interface AttendanceReportData {
  userId: string;
  userName: string;
  totalCheckIns: number;
  onTimeCheckIns: number;
  lateCheckIns: number;
  totalLateMinutes: number;
  averageLateMinutes: number;
  punctualityRate: number;
  attendanceDays: number;
  expectedDays: number;
  attendanceRate: number;
  checkInsByType: {
    entrada: number;
    comida: number;
    regreso_comida: number;
    salida: number;
  };
}

export interface ProductivityReportData {
  userId: string;
  userName: string;
  totalWorkHours: number;
  averageWorkHoursPerDay: number;
  totalLunchMinutes: number;
  averageLunchMinutes: number;
  workDays: number;
  earlyDepartures: number;
  lateArrivals: number;
  perfectDays: number;
}

export interface LocationReportData {
  kioskId: string;
  kioskName: string;
  totalCheckIns: number;
  uniqueUsers: number;
  averageCheckInsPerDay: number;
  invalidLocationCheckIns: number;
  locationAccuracyRate: number;
  peakHour: string;
}

export interface TeamReportData {
  hubId: string;
  hubName: string;
  totalEmployees: number;
  activeEmployees: number;
  averagePunctualityRate: number;
  totalCheckIns: number;
  totalLateMinutes: number;
  attendanceRate: number;
}

export interface MonthlyReportData {
  month: string;
  year: number;
  totalEmployees: number;
  totalCheckIns: number;
  totalWorkHours: number;
  averagePunctualityRate: number;
  averageAttendanceRate: number;
  totalAbsences: number;
  totalLateArrivals: number;
  topPerformers: Array<{ userId: string; userName: string; score: number }>;
  bottomPerformers: Array<{ userId: string; userName: string; score: number }>;
  trends: {
    punctualityTrend: 'up' | 'down' | 'stable';
    attendanceTrend: 'up' | 'down' | 'stable';
  };
}

/**
 * Get check-ins with filters - NO INDEXES NEEDED!
 */
export async function getFilteredCheckIns(filters: ReportFilters): Promise<CheckIn[]> {
  try {
    console.log('🔍 Fetching ALL check-ins (no index needed)...');

    // IMPORTANTE: La colección se llama 'checkins' (minúsculas)
    const snapshot = await getDocs(collection(db, 'checkins'));
    console.log(`📊 Found ${snapshot.docs.length} total check-ins in database`);

    let checkIns = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure timestamp is a Timestamp
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp : Timestamp.fromDate(new Date(data.timestamp))
      } as CheckIn;
    });

    // Log all unique product types in database
    const allProductTypes = [...new Set(checkIns.map(ci => ci.productType))];
    console.log('📦 ALL product types in database:', allProductTypes);

    // Apply ALL filters in memory (no indexes needed!)
    console.log('🔍 Applying date filter...');
    checkIns = checkIns.filter(ci => {
      const ciDate = ci.timestamp instanceof Timestamp ? ci.timestamp.toDate() : new Date(ci.timestamp);
      return ciDate >= filters.startDate && ciDate <= filters.endDate;
    });
    console.log(`📊 After date filter: ${checkIns.length} check-ins`);

    // Handle hub filter: check-ins don't have hubId, but users do
    // So we need to get users from those hubs first, then filter by their userIds
    let allowedUserIds: string[] | undefined = filters.userIds;

    if (filters.hubIds && filters.hubIds.length > 0) {
      console.log('🔍 Filtering by hubs:', filters.hubIds);
      const allUsers = await getAllUsers();
      const usersInHubs = allUsers.filter(u => u.hubId && filters.hubIds!.includes(u.hubId));
      console.log(`📊 Found ${usersInHubs.length} users in selected hubs`);

      const hubUserIds = usersInHubs.map(u => u.id);

      // If there were already userIds in filters, intersect them
      if (allowedUserIds && allowedUserIds.length > 0) {
        allowedUserIds = allowedUserIds.filter(id => hubUserIds.includes(id));
      } else {
        allowedUserIds = hubUserIds;
      }

      console.log(`📊 Total allowed userIds after hub filter: ${allowedUserIds.length}`);
    }

    if (allowedUserIds && allowedUserIds.length > 0) {
      checkIns = checkIns.filter(ci => allowedUserIds!.includes(ci.userId));
      console.log(`🔍 After user/hub filter: ${checkIns.length} check-ins`);
    }

    if (filters.kioskIds && filters.kioskIds.length > 0) {
      checkIns = checkIns.filter(ci => filters.kioskIds!.includes(ci.kioskId));
      console.log(`🔍 After kiosk filter: ${checkIns.length} check-ins`);
    }

    if (filters.productTypes && filters.productTypes.length > 0) {
      console.log('🔍 Filtering by product types:', filters.productTypes);

      // Log unique product types in current check-ins before filtering
      const uniqueProducts = [...new Set(checkIns.map(ci => ci.productType))];
      console.log('📦 Product types found in check-ins before filter:', uniqueProducts);

      checkIns = checkIns.filter(ci => filters.productTypes!.includes(ci.productType));
      console.log(`🔍 After product type filter: ${checkIns.length} check-ins`);

      if (checkIns.length === 0) {
        console.warn('⚠️ NO check-ins match the selected product types!');
        console.warn('Selected:', filters.productTypes);
        console.warn('Available:', uniqueProducts);
      }
    }

    if (filters.checkInType) {
      checkIns = checkIns.filter(ci => ci.type === filters.checkInType);
      console.log(`🔍 After check-in type filter: ${checkIns.length} check-ins`);
    }

    if (filters.status) {
      checkIns = checkIns.filter(ci => ci.status === filters.status);
      console.log(`🔍 After status filter: ${checkIns.length} check-ins`);
    }

    // Sort by timestamp descending
    checkIns.sort((a, b) => {
      const aDate = a.timestamp instanceof Timestamp ? a.timestamp.toDate() : new Date(a.timestamp);
      const bDate = b.timestamp instanceof Timestamp ? b.timestamp.toDate() : new Date(b.timestamp);
      return bDate.getTime() - aDate.getTime();
    });

    console.log(`✅ Final filtered check-ins: ${checkIns.length}`);
    return checkIns;
  } catch (error) {
    console.error('❌ Error getting filtered check-ins:', error);
    throw error;
  }
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
}

/**
 * Get all kiosks
 */
export async function getAllKiosks(): Promise<Kiosk[]> {
  try {
    const snapshot = await getDocs(collection(db, 'kiosks'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Kiosk));
  } catch (error) {
    console.error('Error getting kiosks:', error);
    throw error;
  }
}

/**
 * Get all hubs
 */
export async function getAllHubs(): Promise<Hub[]> {
  try {
    const snapshot = await getDocs(collection(db, 'hubs'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Hub));
  } catch (error) {
    console.error('Error getting hubs:', error);
    throw error;
  }
}

/**
 * Generate Attendance Report
 */
export async function generateAttendanceReport(filters: ReportFilters): Promise<AttendanceReportData[]> {
  try {
    console.log('📊 Generating attendance report...');
    const checkIns = await getFilteredCheckIns(filters);
    const users = await getAllUsers();

    const reportData: AttendanceReportData[] = [];

    // Filter users based on all criteria
    let relevantUsers = users.filter(u => u.status === 'active');

    if (filters.userIds && filters.userIds.length > 0) {
      relevantUsers = relevantUsers.filter(u => filters.userIds!.includes(u.id));
    }

    if (filters.hubIds && filters.hubIds.length > 0) {
      relevantUsers = relevantUsers.filter(u => u.hubId && filters.hubIds!.includes(u.hubId));
    }

    if (filters.supervisorIds && filters.supervisorIds.length > 0) {
      relevantUsers = relevantUsers.filter(u => u.supervisorId && filters.supervisorIds!.includes(u.supervisorId));
    }

    if (filters.productTypes && filters.productTypes.length > 0) {
      relevantUsers = relevantUsers.filter(u => filters.productTypes!.includes(u.productType));
    }

    console.log(`👥 Processing ${relevantUsers.length} users`);

    for (const user of relevantUsers) {
      const userCheckIns = checkIns.filter(ci => ci.userId === user.id);

      if (userCheckIns.length === 0) continue;

      const onTimeCheckIns = userCheckIns.filter(ci => ci.status === 'a_tiempo').length;
      const lateCheckIns = userCheckIns.filter(ci => ci.status === 'retrasado').length;

      // Only sum minutes late from check-ins that are actually late (status === 'retrasado')
      const totalLateMinutes = userCheckIns
        .filter(ci => ci.status === 'retrasado' && ci.validationResults?.minutesLate)
        .reduce((sum, ci) => sum + (ci.validationResults?.minutesLate || 0), 0);

      const checkInsByType = {
        entrada: userCheckIns.filter(ci => ci.type === 'entrada').length,
        comida: userCheckIns.filter(ci => ci.type === 'comida').length,
        regreso_comida: userCheckIns.filter(ci => ci.type === 'regreso_comida').length,
        salida: userCheckIns.filter(ci => ci.type === 'salida').length,
      };

      // Calculate unique attendance days
      const attendanceDays = new Set(
        userCheckIns.map(ci => {
          const date = ci.timestamp instanceof Timestamp
            ? ci.timestamp.toDate()
            : new Date(ci.timestamp);
          return date.toISOString().split('T')[0];
        })
      ).size;

      // Calculate expected days only in the range where user has check-ins
      let expectedDays = 0;
      if (userCheckIns.length > 0) {
        const userDates = userCheckIns.map(ci => {
          const date = ci.timestamp instanceof Timestamp ? ci.timestamp.toDate() : new Date(ci.timestamp);
          return date;
        });
        const userStartDate = new Date(Math.min(...userDates.map(d => d.getTime())));
        const userEndDate = new Date(Math.max(...userDates.map(d => d.getTime())));
        expectedDays = calculateBusinessDays(userStartDate, userEndDate);
      }

      // Cap attendance rate at 100%
      const rawAttendanceRate = expectedDays > 0 ? (attendanceDays / expectedDays) * 100 : 0;
      const attendanceRate = Math.min(rawAttendanceRate, 100);

      reportData.push({
        userId: user.id,
        userName: user.name,
        totalCheckIns: userCheckIns.length,
        onTimeCheckIns,
        lateCheckIns,
        totalLateMinutes,
        averageLateMinutes: lateCheckIns > 0 ? totalLateMinutes / lateCheckIns : 0,
        punctualityRate: userCheckIns.length > 0 ? (onTimeCheckIns / userCheckIns.length) * 100 : 0,
        attendanceDays,
        expectedDays,
        attendanceRate,
        checkInsByType,
      });
    }

    return reportData.sort((a, b) => b.punctualityRate - a.punctualityRate);
  } catch (error) {
    console.error('Error generating attendance report:', error);
    throw error;
  }
}

/**
 * Generate Productivity Report
 */
export async function generateProductivityReport(filters: ReportFilters): Promise<ProductivityReportData[]> {
  try {
    const checkIns = await getFilteredCheckIns(filters);
    const users = await getAllUsers();

    const reportData: ProductivityReportData[] = [];

    const relevantUsers = filters.userIds && filters.userIds.length > 0
      ? users.filter(u => filters.userIds!.includes(u.id))
      : users.filter(u => u.status === 'active');

    for (const user of relevantUsers) {
      const userCheckIns = checkIns.filter(ci => ci.userId === user.id);

      if (userCheckIns.length === 0) continue;

      // Group check-ins by date
      const checkInsByDate = groupCheckInsByDate(userCheckIns);

      let totalWorkHours = 0;
      let totalLunchMinutes = 0;
      let earlyDepartures = 0;
      let lateArrivals = 0;
      let perfectDays = 0;

      for (const [date, dayCheckIns] of Object.entries(checkInsByDate)) {
        const entrada = dayCheckIns.find(ci => ci.type === 'entrada');
        const salida = dayCheckIns.find(ci => ci.type === 'salida');
        const comida = dayCheckIns.find(ci => ci.type === 'comida');
        const regresoComida = dayCheckIns.find(ci => ci.type === 'regreso_comida');

        // Calculate work hours - only if salida is AFTER entrada
        if (entrada && salida) {
          const entradaTime = entrada.timestamp instanceof Timestamp
            ? entrada.timestamp.toDate()
            : new Date(entrada.timestamp);
          const salidaTime = salida.timestamp instanceof Timestamp
            ? salida.timestamp.toDate()
            : new Date(salida.timestamp);

          const workMinutes = (salidaTime.getTime() - entradaTime.getTime()) / (1000 * 60);

          // Only add positive work hours (salida must be after entrada)
          if (workMinutes > 0) {
            totalWorkHours += workMinutes / 60;
          } else {
            console.warn(`⚠️ Invalid work hours for ${user.name} on ${date}: salida before entrada`);
          }
        }

        // Calculate lunch time - only if regreso is AFTER comida
        if (comida && regresoComida) {
          const comidaTime = comida.timestamp instanceof Timestamp
            ? comida.timestamp.toDate()
            : new Date(comida.timestamp);
          const regresoTime = regresoComida.timestamp instanceof Timestamp
            ? regresoComida.timestamp.toDate()
            : new Date(regresoComida.timestamp);

          const lunchMinutes = (regresoTime.getTime() - comidaTime.getTime()) / (1000 * 60);

          // Only add positive lunch minutes
          if (lunchMinutes > 0) {
            totalLunchMinutes += lunchMinutes;
          } else {
            console.warn(`⚠️ Invalid lunch time for ${user.name} on ${date}: regreso before comida`);
          }
        }

        // Count issues
        if (entrada && entrada.status === 'retrasado') lateArrivals++;
        if (salida && salida.status === 'anticipado') earlyDepartures++;

        // Perfect day: all check-ins on time
        const allOnTime = dayCheckIns.every(ci => ci.status === 'a_tiempo');
        if (allOnTime && dayCheckIns.length >= 2) perfectDays++;
      }

      const workDays = Object.keys(checkInsByDate).length;

      reportData.push({
        userId: user.id,
        userName: user.name,
        totalWorkHours,
        averageWorkHoursPerDay: workDays > 0 ? totalWorkHours / workDays : 0,
        totalLunchMinutes,
        averageLunchMinutes: workDays > 0 ? totalLunchMinutes / workDays : 0,
        workDays,
        earlyDepartures,
        lateArrivals,
        perfectDays,
      });
    }

    return reportData.sort((a, b) => b.totalWorkHours - a.totalWorkHours);
  } catch (error) {
    console.error('Error generating productivity report:', error);
    throw error;
  }
}

/**
 * Generate Location Report
 */
export async function generateLocationReport(filters: ReportFilters): Promise<LocationReportData[]> {
  try {
    const checkIns = await getFilteredCheckIns(filters);
    const kiosks = await getAllKiosks();

    const reportData: LocationReportData[] = [];

    for (const kiosk of kiosks) {
      const kioskCheckIns = checkIns.filter(ci => ci.kioskId === kiosk.id);

      if (kioskCheckIns.length === 0) continue;

      const uniqueUsers = new Set(kioskCheckIns.map(ci => ci.userId)).size;
      const invalidLocationCheckIns = kioskCheckIns.filter(ci => ci.status === 'ubicacion_invalida').length;

      const days = calculateBusinessDays(filters.startDate, filters.endDate);
      const averageCheckInsPerDay = days > 0 ? kioskCheckIns.length / days : 0;

      // Calculate peak hour
      const hourCounts: { [hour: string]: number } = {};
      kioskCheckIns.forEach(ci => {
        const date = ci.timestamp instanceof Timestamp
          ? ci.timestamp.toDate()
          : new Date(ci.timestamp);
        const hour = date.getHours();
        const hourKey = `${hour}:00`;
        hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;
      });

      const peakHour = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      reportData.push({
        kioskId: kiosk.id,
        kioskName: kiosk.name,
        totalCheckIns: kioskCheckIns.length,
        uniqueUsers,
        averageCheckInsPerDay,
        invalidLocationCheckIns,
        locationAccuracyRate: kioskCheckIns.length > 0
          ? ((kioskCheckIns.length - invalidLocationCheckIns) / kioskCheckIns.length) * 100
          : 0,
        peakHour,
      });
    }

    return reportData.sort((a, b) => b.totalCheckIns - a.totalCheckIns);
  } catch (error) {
    console.error('Error generating location report:', error);
    throw error;
  }
}

/**
 * Generate Team Report
 */
export async function generateTeamReport(filters: ReportFilters): Promise<TeamReportData[]> {
  try {
    const checkIns = await getFilteredCheckIns(filters);
    const users = await getAllUsers();
    const hubs = await getAllHubs();

    const reportData: TeamReportData[] = [];

    for (const hub of hubs) {
      const hubUsers = users.filter(u => u.hubId === hub.id);
      const activeHubUsers = hubUsers.filter(u => u.status === 'active');

      if (hubUsers.length === 0) continue;

      const hubUserIds = hubUsers.map(u => u.id);
      const hubCheckIns = checkIns.filter(ci => hubUserIds.includes(ci.userId));

      const onTimeCheckIns = hubCheckIns.filter(ci => ci.status === 'a_tiempo').length;
      const totalLateMinutes = hubCheckIns
        .filter(ci => ci.validationResults?.minutesLate)
        .reduce((sum, ci) => sum + (ci.validationResults?.minutesLate || 0), 0);

      // Calculate attendance rate
      const expectedDays = calculateBusinessDays(filters.startDate, filters.endDate);
      const totalExpectedCheckIns = activeHubUsers.length * expectedDays;
      const attendanceRate = totalExpectedCheckIns > 0
        ? (hubCheckIns.length / totalExpectedCheckIns) * 100
        : 0;

      reportData.push({
        hubId: hub.id,
        hubName: hub.name,
        totalEmployees: hubUsers.length,
        activeEmployees: activeHubUsers.length,
        averagePunctualityRate: hubCheckIns.length > 0
          ? (onTimeCheckIns / hubCheckIns.length) * 100
          : 0,
        totalCheckIns: hubCheckIns.length,
        totalLateMinutes,
        attendanceRate,
      });
    }

    return reportData.sort((a, b) => b.averagePunctualityRate - a.averagePunctualityRate);
  } catch (error) {
    console.error('Error generating team report:', error);
    throw error;
  }
}

/**
 * Generate Monthly Report
 */
export async function generateMonthlyReport(filters: ReportFilters): Promise<MonthlyReportData> {
  try {
    const checkIns = await getFilteredCheckIns(filters);
    const users = await getAllUsers();
    const activeUsers = users.filter(u => u.status === 'active');

    const month = filters.startDate.toLocaleDateString('es-MX', { month: 'long' });
    const year = filters.startDate.getFullYear();

    // Calculate total work hours
    const checkInsByUser = groupCheckInsByUser(checkIns);
    let totalWorkHours = 0;

    for (const [userId, userCheckIns] of Object.entries(checkInsByUser)) {
      const byDate = groupCheckInsByDate(userCheckIns);
      for (const dayCheckIns of Object.values(byDate)) {
        const entrada = dayCheckIns.find(ci => ci.type === 'entrada');
        const salida = dayCheckIns.find(ci => ci.type === 'salida');

        if (entrada && salida) {
          const entradaTime = entrada.timestamp instanceof Timestamp
            ? entrada.timestamp.toDate()
            : new Date(entrada.timestamp);
          const salidaTime = salida.timestamp instanceof Timestamp
            ? salida.timestamp.toDate()
            : new Date(salida.timestamp);

          const workMinutes = (salidaTime.getTime() - entradaTime.getTime()) / (1000 * 60);

          // Only add positive work hours
          if (workMinutes > 0) {
            totalWorkHours += workMinutes / 60;
          }
        }
      }
    }

    // Calculate metrics
    const onTimeCheckIns = checkIns.filter(ci => ci.status === 'a_tiempo').length;
    const averagePunctualityRate = checkIns.length > 0
      ? (onTimeCheckIns / checkIns.length) * 100
      : 0;

    const expectedDays = calculateBusinessDays(filters.startDate, filters.endDate);
    const totalExpectedCheckIns = activeUsers.length * expectedDays;
    const rawAttendanceRate = totalExpectedCheckIns > 0
      ? (checkIns.length / totalExpectedCheckIns) * 100
      : 0;
    const averageAttendanceRate = Math.min(rawAttendanceRate, 100);

    const totalAbsences = totalExpectedCheckIns - checkIns.length;
    const totalLateArrivals = checkIns.filter(ci =>
      ci.type === 'entrada' && ci.status === 'retrasado'
    ).length;

    // Calculate top and bottom performers
    const userScores = activeUsers.map(user => {
      const userCheckIns = checkIns.filter(ci => ci.userId === user.id);
      const onTime = userCheckIns.filter(ci => ci.status === 'a_tiempo').length;
      const score = userCheckIns.length > 0 ? (onTime / userCheckIns.length) * 100 : 0;

      return {
        userId: user.id,
        userName: user.name,
        score,
      };
    }).filter(u => u.score > 0);

    const topPerformers = userScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const bottomPerformers = userScores
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    return {
      month,
      year,
      totalEmployees: activeUsers.length,
      totalCheckIns: checkIns.length,
      totalWorkHours,
      averagePunctualityRate,
      averageAttendanceRate,
      totalAbsences,
      totalLateArrivals,
      topPerformers,
      bottomPerformers,
      trends: {
        punctualityTrend: 'stable', // TODO: Calculate from historical data
        attendanceTrend: 'stable',  // TODO: Calculate from historical data
      },
    };
  } catch (error) {
    console.error('Error generating monthly report:', error);
    throw error;
  }
}

/**
 * Helper: Calculate business days between two dates
 */
function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Helper: Group check-ins by date
 */
function groupCheckInsByDate(checkIns: CheckIn[]): { [date: string]: CheckIn[] } {
  const grouped: { [date: string]: CheckIn[] } = {};

  checkIns.forEach(ci => {
    const date = ci.timestamp instanceof Timestamp
      ? ci.timestamp.toDate()
      : new Date(ci.timestamp);
    const dateKey = date.toISOString().split('T')[0];

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(ci);
  });

  return grouped;
}

/**
 * Helper: Group check-ins by user
 */
function groupCheckInsByUser(checkIns: CheckIn[]): { [userId: string]: CheckIn[] } {
  const grouped: { [userId: string]: CheckIn[] } = {};

  checkIns.forEach(ci => {
    if (!grouped[ci.userId]) {
      grouped[ci.userId] = [];
    }
    grouped[ci.userId].push(ci);
  });

  return grouped;
}
