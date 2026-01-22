// src/services/reportsService.ts - Service for generating and managing reports
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  limit
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

// ============== CACHÉ EN MEMORIA ==============
// Evita re-cargar usuarios, kiosks y hubs que raramente cambian
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const cache: {
  users?: CacheEntry<User[]>;
  kiosks?: CacheEntry<Kiosk[]>;
  hubs?: CacheEntry<Hub[]>;
} = {};

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
 * Get check-ins with filters - OPTIMIZADO para reducir lecturas de Firestore
 */
export async function getFilteredCheckIns(filters: ReportFilters): Promise<CheckIn[]> {
  try {
    const startTime = Date.now();
    console.log('🚀 [OPTIMIZED] Fetching check-ins with Firestore query filters...');
    console.log('📅 Date range:', filters.startDate.toISOString(), 'to', filters.endDate.toISOString());

    // ============== QUERY OPTIMIZADA CON FILTROS DE FIRESTORE ==============
    // Usar where() en Firestore para filtrar ANTES de cargar en memoria
    const constraints = [
      where('timestamp', '>=', Timestamp.fromDate(filters.startDate)),
      where('timestamp', '<=', Timestamp.fromDate(filters.endDate)),
      orderBy('timestamp', 'desc')
    ];

    // IMPORTANTE: Límite máximo de Firestore es 10,000 documentos por query
    // Si necesitas más check-ins en un reporte, considera dividir en rangos más pequeños (por semana)
    const MAX_CHECKINS = 10000;
    constraints.push(limit(MAX_CHECKINS));

    const q = query(collection(db, 'checkins'), ...constraints);
    const snapshot = await getDocs(q);

    console.log(`📊 Firestore returned ${snapshot.docs.length} check-ins (filtered by date in DB)`);
    if (snapshot.docs.length === MAX_CHECKINS) {
      console.warn(`⚠️ Hit maximum limit of ${MAX_CHECKINS} check-ins. Consider narrowing date range.`);
    }

    let checkIns = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp : Timestamp.fromDate(new Date(data.timestamp))
      } as CheckIn;
    });

    const initialCount = checkIns.length;

    // ============== FILTROS SECUNDARIOS EN MEMORIA (solo sobre conjunto reducido) ==============

    // Filtros de producto (rápido, solo sobre check-ins ya filtrados por fecha)
    if (filters.productTypes && filters.productTypes.length > 0) {
      checkIns = checkIns.filter(ci => filters.productTypes!.includes(ci.productType));
      console.log(`📦 After product type filter: ${checkIns.length} check-ins`);
    }

    // Filtros de kiosk (rápido, solo sobre check-ins ya filtrados)
    if (filters.kioskIds && filters.kioskIds.length > 0) {
      checkIns = checkIns.filter(ci => filters.kioskIds!.includes(ci.kioskId));
      console.log(`🏪 After kiosk filter: ${checkIns.length} check-ins`);
    }

    // Filtro de tipo de check-in
    if (filters.checkInType) {
      checkIns = checkIns.filter(ci => ci.type === filters.checkInType);
      console.log(`📝 After check-in type filter: ${checkIns.length} check-ins`);
    }

    // Filtro de estado
    if (filters.status) {
      checkIns = checkIns.filter(ci => ci.status === filters.status);
      console.log(`✅ After status filter: ${checkIns.length} check-ins`);
    }

    // Filtros de usuario/hub (requiere cargar usuarios, usa caché)
    let allowedUserIds: string[] | undefined = filters.userIds;

    if (filters.hubIds && filters.hubIds.length > 0) {
      console.log('🔍 Filtering by hubs:', filters.hubIds);
      const allUsers = await getAllUsers(); // Usa caché
      const usersInHubs = allUsers.filter(u => u.hubId && filters.hubIds!.includes(u.hubId));
      console.log(`📊 Found ${usersInHubs.length} users in selected hubs`);

      const hubUserIds = usersInHubs.map(u => u.id);

      if (allowedUserIds && allowedUserIds.length > 0) {
        allowedUserIds = allowedUserIds.filter(id => hubUserIds.includes(id));
      } else {
        allowedUserIds = hubUserIds;
      }
    }

    if (allowedUserIds && allowedUserIds.length > 0) {
      checkIns = checkIns.filter(ci => allowedUserIds!.includes(ci.userId));
      console.log(`👥 After user/hub filter: ${checkIns.length} check-ins`);
    }

    // Filtro por supervisor (requiere cargar usuarios)
    if (filters.supervisorIds && filters.supervisorIds.length > 0) {
      const allUsers = await getAllUsers(); // Usa caché
      const supervisedUserIds = allUsers
        .filter(u => u.supervisorId && filters.supervisorIds!.includes(u.supervisorId))
        .map(u => u.id);

      checkIns = checkIns.filter(ci => supervisedUserIds.includes(ci.userId));
      console.log(`👨‍💼 After supervisor filter: ${checkIns.length} check-ins`);
    }

    // Ya vienen ordenados por timestamp desc de la query
    const endTime = Date.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ [OPTIMIZED] Final filtered check-ins: ${checkIns.length} (${initialCount} → ${checkIns.length})`);
    console.log(`⏱️ Query completed in ${elapsed}s`);

    return checkIns;
  } catch (error) {
    console.error('❌ Error getting filtered check-ins:', error);
    throw error;
  }
}

/**
 * Get all users (CON CACHÉ)
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const now = Date.now();

    // Verificar si hay datos en caché válidos
    if (cache.users && (now - cache.users.timestamp) < CACHE_TTL) {
      console.log('📦 Using cached users');
      return cache.users.data;
    }

    console.log('🔄 Loading users from Firestore...');
    const snapshot = await getDocs(collection(db, 'users'));
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));

    // Guardar en caché
    cache.users = { data: users, timestamp: now };
    console.log(`✅ Loaded and cached ${users.length} users`);

    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
}

/**
 * Get all kiosks (CON CACHÉ)
 */
export async function getAllKiosks(): Promise<Kiosk[]> {
  try {
    const now = Date.now();

    // Verificar si hay datos en caché válidos
    if (cache.kiosks && (now - cache.kiosks.timestamp) < CACHE_TTL) {
      console.log('📦 Using cached kiosks');
      return cache.kiosks.data;
    }

    console.log('🔄 Loading kiosks from Firestore...');
    const snapshot = await getDocs(collection(db, 'kiosks'));
    const kiosks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Kiosk));

    // Guardar en caché
    cache.kiosks = { data: kiosks, timestamp: now };
    console.log(`✅ Loaded and cached ${kiosks.length} kiosks`);

    return kiosks;
  } catch (error) {
    console.error('Error getting kiosks:', error);
    throw error;
  }
}

/**
 * Get all hubs (CON CACHÉ)
 */
export async function getAllHubs(): Promise<Hub[]> {
  try {
    const now = Date.now();

    // Verificar si hay datos en caché válidos
    if (cache.hubs && (now - cache.hubs.timestamp) < CACHE_TTL) {
      console.log('📦 Using cached hubs');
      return cache.hubs.data;
    }

    console.log('🔄 Loading hubs from Firestore...');
    const snapshot = await getDocs(collection(db, 'hubs'));
    const hubs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Hub));

    // Guardar en caché
    cache.hubs = { data: hubs, timestamp: now };
    console.log(`✅ Loaded and cached ${hubs.length} hubs`);

    return hubs;
  } catch (error) {
    console.error('Error getting hubs:', error);
    throw error;
  }
}

/**
 * Limpiar caché manualmente (útil si se actualizan usuarios/kiosks/hubs)
 */
export function clearReportsCache(): void {
  cache.users = undefined;
  cache.kiosks = undefined;
  cache.hubs = undefined;
  console.log('🗑️ Reports cache cleared');
}

/**
 * Generate Attendance Report (OPTIMIZADO)
 */
export async function generateAttendanceReport(filters: ReportFilters): Promise<AttendanceReportData[]> {
  try {
    console.log('📊 [OPTIMIZED] Generating attendance report...');
    const checkIns = await getFilteredCheckIns(filters);

    // Solo cargar usuarios si es necesario
    const userIdsFromCheckIns = new Set(checkIns.map(ci => ci.userId));
    console.log(`👥 Found ${userIdsFromCheckIns.size} unique users in filtered check-ins`);

    // Cargar SOLO usuarios activos (usa caché)
    const allUsers = await getAllUsers();
    const relevantUsers = allUsers.filter(u =>
      u.status === 'active' && userIdsFromCheckIns.has(u.id)
    );

    console.log(`👥 Processing ${relevantUsers.length} active users (from ${allUsers.length} total)`);

    const reportData: AttendanceReportData[] = [];

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
 * Generate Productivity Report (OPTIMIZADO)
 */
export async function generateProductivityReport(filters: ReportFilters): Promise<ProductivityReportData[]> {
  try {
    console.log('📊 [OPTIMIZED] Generating productivity report...');
    const checkIns = await getFilteredCheckIns(filters);

    const reportData: ProductivityReportData[] = [];

    // Get unique user IDs from filtered check-ins
    const userIdsFromCheckIns = new Set(checkIns.map(ci => ci.userId));

    // Cargar SOLO usuarios activos (usa caché)
    const allUsers = await getAllUsers();
    const relevantUsers = allUsers.filter(u =>
      u.status === 'active' && userIdsFromCheckIns.has(u.id)
    );

    console.log(`👥 Processing ${relevantUsers.length} users for productivity`);

    for (const user of relevantUsers) {
      const userCheckIns = checkIns.filter(ci => ci.userId === user.id);

      if (userCheckIns.length === 0) continue;

      console.log(`\n👤 ${user.name}: ${userCheckIns.length} check-ins`);

      // Group check-ins by date
      const checkInsByDate = groupCheckInsByDate(userCheckIns);
      console.log(`  📅 ${Object.keys(checkInsByDate).length} días con check-ins`);

      let totalWorkHours = 0;
      let totalLunchMinutes = 0;
      let earlyDepartures = 0;
      let lateArrivals = 0;
      let perfectDays = 0;
      let daysWithWorkHours = 0; // Only count days where we calculated actual work hours
      let daysWithLunch = 0; // Only count days where we calculated lunch time

      for (const [date, dayCheckIns] of Object.entries(checkInsByDate)) {
        // Sort check-ins by timestamp to ensure correct pairing
        const sortedCheckIns = dayCheckIns.sort((a, b) => {
          const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
          const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
          return aTime - bTime;
        });

        // Log what check-ins we have for this day
        const types = sortedCheckIns.map(ci => {
          const time = ci.timestamp instanceof Timestamp ? ci.timestamp.toDate() : new Date(ci.timestamp);
          return `${ci.type}:${time.toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'})}`;
        });
        console.log(`    📆 ${date}: [${types.join(', ')}]`);

        const entrada = sortedCheckIns.find(ci => ci.type === 'entrada');
        const salida = sortedCheckIns.find((ci, idx) => {
          // Find salida that comes AFTER entrada
          if (ci.type !== 'salida') return false;
          if (!entrada) return true; // No entrada, take first salida

          const entradaIdx = sortedCheckIns.indexOf(entrada);
          return idx > entradaIdx; // Salida must be after entrada
        });

        if (!entrada) console.log(`      ⚠️ No entrada found`);
        if (!salida) console.log(`      ⚠️ No salida found`);
        if (entrada && !salida) console.log(`      ⚠️ Entrada found but no salida after it`);

        const comida = sortedCheckIns.find(ci => ci.type === 'comida');
        const regresoComida = sortedCheckIns.find((ci, idx) => {
          // Find regreso_comida that comes AFTER comida
          if (ci.type !== 'regreso_comida') return false;
          if (!comida) return true;

          const comidaIdx = sortedCheckIns.indexOf(comida);
          return idx > comidaIdx;
        });

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
            daysWithWorkHours++; // Count this day as having valid work hours
            console.log(`      ✅ Horas trabajadas: ${(workMinutes / 60).toFixed(2)} hrs`);
          } else {
            console.warn(`      ⚠️ Invalid work hours: salida before entrada (${entradaTime.toLocaleTimeString('es-MX')} -> ${salidaTime.toLocaleTimeString('es-MX')})`);
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
            daysWithLunch++; // Count this day as having valid lunch time
          } else {
            console.warn(`⚠️ Invalid lunch time for ${user.name} on ${date}: regreso before comida`);
          }
        }

        // Count issues
        if (entrada && entrada.status === 'retrasado') lateArrivals++;
        if (salida && salida.status === 'anticipado') earlyDepartures++;

        // Perfect day: all check-ins on time AND has at least entrada+salida
        const allOnTime = sortedCheckIns.every(ci => ci.status === 'a_tiempo');
        if (allOnTime && entrada && salida) perfectDays++;
      }

      const workDays = daysWithWorkHours; // Use actual days with calculated hours

      console.log(`  ✅ RESUMEN: ${totalWorkHours.toFixed(2)} hrs totales en ${daysWithWorkHours} días (promedio: ${daysWithWorkHours > 0 ? (totalWorkHours / daysWithWorkHours).toFixed(2) : 0} hrs/día)`);

      reportData.push({
        userId: user.id,
        userName: user.name,
        totalWorkHours,
        averageWorkHoursPerDay: daysWithWorkHours > 0 ? totalWorkHours / daysWithWorkHours : 0,
        totalLunchMinutes,
        averageLunchMinutes: daysWithLunch > 0 ? totalLunchMinutes / daysWithLunch : 0,
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
 * Generate Location Report (OPTIMIZADO)
 */
export async function generateLocationReport(filters: ReportFilters): Promise<LocationReportData[]> {
  try {
    console.log('📊 [OPTIMIZED] Generating location report...');
    const checkIns = await getFilteredCheckIns(filters);
    const kiosks = await getAllKiosks(); // Usa caché

    const reportData: LocationReportData[] = [];

    for (const kiosk of kiosks) {
      const kioskCheckIns = checkIns.filter(ci => ci.kioskId === kiosk.id);

      if (kioskCheckIns.length === 0) continue;

      const uniqueUsers = new Set(kioskCheckIns.map(ci => ci.userId)).size;
      const invalidLocationCheckIns = kioskCheckIns.filter(ci => ci.status === 'ubicacion_invalida').length;

      // Calculate unique days where this kiosk had check-ins
      const uniqueDays = new Set(
        kioskCheckIns.map(ci => {
          const date = ci.timestamp instanceof Timestamp
            ? ci.timestamp.toDate()
            : new Date(ci.timestamp);
          return date.toISOString().split('T')[0];
        })
      ).size;

      const averageCheckInsPerDay = uniqueDays > 0 ? kioskCheckIns.length / uniqueDays : 0;

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
      });
    }

    return reportData.sort((a, b) => b.totalCheckIns - a.totalCheckIns);
  } catch (error) {
    console.error('Error generating location report:', error);
    throw error;
  }
}

/**
 * Generate Team Report (OPTIMIZADO)
 */
export async function generateTeamReport(filters: ReportFilters): Promise<TeamReportData[]> {
  try {
    console.log('📊 [OPTIMIZED] Generating team report...');
    const checkIns = await getFilteredCheckIns(filters);
    const users = await getAllUsers(); // Usa caché
    const hubs = await getAllHubs(); // Usa caché

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
 * Generate Monthly Report (OPTIMIZADO)
 */
export async function generateMonthlyReport(filters: ReportFilters): Promise<MonthlyReportData> {
  try {
    console.log('📊 [OPTIMIZED] Generating monthly report...');
    const checkIns = await getFilteredCheckIns(filters);
    const users = await getAllUsers(); // Usa caché
    const activeUsers = users.filter(u => u.status === 'active');

    const month = filters.startDate.toLocaleDateString('es-MX', { month: 'long' });
    const year = filters.startDate.getFullYear();

    // Calculate total work hours
    const checkInsByUser = groupCheckInsByUser(checkIns);
    let totalWorkHours = 0;

    for (const [userId, userCheckIns] of Object.entries(checkInsByUser)) {
      const byDate = groupCheckInsByDate(userCheckIns);
      for (const dayCheckIns of Object.values(byDate)) {
        // Sort check-ins by timestamp to ensure correct pairing
        const sortedCheckIns = dayCheckIns.sort((a, b) => {
          const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
          const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
          return aTime - bTime;
        });

        const entrada = sortedCheckIns.find(ci => ci.type === 'entrada');
        const salida = sortedCheckIns.find((ci, idx) => {
          // Find salida that comes AFTER entrada
          if (ci.type !== 'salida') return false;
          if (!entrada) return true;

          const entradaIdx = sortedCheckIns.indexOf(entrada);
          return idx > entradaIdx;
        });

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
 * Helper: Group check-ins by date (LOCAL timezone, not UTC)
 */
function groupCheckInsByDate(checkIns: CheckIn[]): { [date: string]: CheckIn[] } {
  const grouped: { [date: string]: CheckIn[] } = {};

  checkIns.forEach(ci => {
    const date = ci.timestamp instanceof Timestamp
      ? ci.timestamp.toDate()
      : new Date(ci.timestamp);

    // Use LOCAL date, not UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

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
