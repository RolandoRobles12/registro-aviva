// src/services/schedules.ts - VERSIÓN CORREGIDA Y COMPLETA
import { collection, doc, getDoc, setDoc, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ProductSchedule, ProductType, Holiday } from '../types';

export class ScheduleService {
  /**
   * Get schedule for a product type
   */
  static async getProductSchedule(productType: ProductType): Promise<ProductSchedule | null> {
    try {
      const docRef = doc(db, 'product_schedules', productType);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as ProductSchedule;
      }
      
      // Return default schedule if none exists
      return this.getDefaultSchedule(productType);
    } catch (error) {
      console.error('Error getting product schedule:', error);
      return this.getDefaultSchedule(productType);
    }
  }

  /**
   * Save product schedule
   */
  static async saveProductSchedule(schedule: Omit<ProductSchedule, 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const docRef = doc(db, 'product_schedules', schedule.productType);
      await setDoc(docRef, {
        ...schedule,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving product schedule:', error);
      throw error;
    }
  }

  /**
   * Get default schedule based on product type
   */
  static getDefaultSchedule(productType: ProductType): ProductSchedule {
    const baseSchedule = {
      id: productType,
      productType,
      schedule: {
        entryTime: "08:00",
        exitTime: "18:00",
        lunchStartTime: "14:00",
        lunchDuration: 60
      },
      toleranceMinutes: 5,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    switch (productType) {
      case 'BA':
        // Bodega Aurrera - works all days including holidays
        return {
          ...baseSchedule,
          workDays: [0, 1, 2, 3, 4, 5, 6], // All days
          worksOnHolidays: true,
          schedule: {
            entryTime: "07:00",
            exitTime: "19:00",
            lunchStartTime: "14:00",
            lunchDuration: 60
          }
        };
      
      case 'Aviva_Contigo':
        // Monday to Saturday, no holidays
        return {
          ...baseSchedule,
          workDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
          worksOnHolidays: false
        };
      
      case 'Casa_Marchand':
        // Monday to Friday
        return {
          ...baseSchedule,
          workDays: [1, 2, 3, 4, 5], // Mon-Fri
          worksOnHolidays: false,
          schedule: {
            entryTime: "09:00",
            exitTime: "18:00",
            lunchStartTime: "14:00",
            lunchDuration: 60
          }
        };
      
      case 'Construrama':
        // Monday to Saturday
        return {
          ...baseSchedule,
          workDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
          worksOnHolidays: false,
          schedule: {
            entryTime: "08:00",
            exitTime: "17:00",
            lunchStartTime: "13:00",
            lunchDuration: 60
          }
        };
      
      case 'Disensa':
        // Monday to Saturday
        return {
          ...baseSchedule,
          workDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
          worksOnHolidays: false,
          schedule: {
            entryTime: "08:00",
            exitTime: "18:00",
            lunchStartTime: "14:00",
            lunchDuration: 60
          }
        };
      
      default:
        // Default: Monday to Friday
        return {
          ...baseSchedule,
          workDays: [1, 2, 3, 4, 5], // Mon-Fri
          worksOnHolidays: false
        };
    }
  }

  /**
   * Check if today is a work day for the product
   */
  static async isWorkDay(productType: ProductType, date: Date = new Date()): Promise<boolean> {
    const schedule = await this.getProductSchedule(productType);
    if (!schedule) return false;

    const dayOfWeek = date.getDay();
    
    // Check if it's a regular work day
    if (!schedule.workDays.includes(dayOfWeek)) {
      return false;
    }

    // Check holidays if product doesn't work on holidays
    if (!schedule.worksOnHolidays) {
      const holidays = await this.getHolidaysForDate(date);
      if (holidays.length > 0) {
        // Check if any holiday applies to this product
        const applicableHoliday = holidays.find(h => 
          !h.productTypes || h.productTypes.includes(productType)
        );
        if (applicableHoliday) return false;
      }
    }

    return true;
  }

  /**
   * Get holidays for a specific date
   */
  static async getHolidaysForDate(date: Date): Promise<Holiday[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, 'holidays'),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Holiday));
    } catch (error) {
      console.error('Error getting holidays:', error);
      return [];
    }
  }

  /**
   * ✅ CORREGIDO: Validate check-in timing con lógica específica por tipo
   */
  static async validateCheckInTiming(
    productType: ProductType,
    checkInType: string,
    timestamp: Date,
    lastLunchCheckIn?: Date
  ): Promise<{
    isOnTime: boolean;
    minutesLate: number;
    minutesEarly: number;
    status: 'a_tiempo' | 'retrasado' | 'anticipado';
  }> {
    const schedule = await this.getProductSchedule(productType);
    if (!schedule) {
      return { isOnTime: true, minutesLate: 0, minutesEarly: 0, status: 'a_tiempo' };
    }

    const checkTime = timestamp;
    const checkHours = checkTime.getHours();
    const checkMinutes = checkTime.getMinutes();
    const checkTotalMinutes = checkHours * 60 + checkMinutes;

    // ✅ LÓGICA ESPECÍFICA POR TIPO DE CHECK-IN
    switch (checkInType) {
      case 'entrada':
        return this.validateEntryTiming(schedule, checkTotalMinutes);
      
      case 'comida':
        // ✅ COMIDA: SIN VALIDACIÓN DE ESTADO - siempre 'a_tiempo'
        return { 
          isOnTime: true, 
          minutesLate: 0, 
          minutesEarly: 0, 
          status: 'a_tiempo' 
        };
      
      case 'regreso_comida':
        // ✅ REGRESO COMIDA: VALIDAR DURACIÓN DE 1 HORA DESDE LA COMIDA
        return this.validateLunchReturnTiming(schedule, checkTime, lastLunchCheckIn);
      
      case 'salida':
        return this.validateExitTiming(schedule, checkTotalMinutes);
      
      default:
        return { isOnTime: true, minutesLate: 0, minutesEarly: 0, status: 'a_tiempo' };
    }
  }

  /**
   * ✅ Validar timing de entrada
   */
  private static validateEntryTiming(
    schedule: ProductSchedule, 
    checkTotalMinutes: number
  ) {
    const [expectedHours, expectedMinutes] = schedule.schedule.entryTime.split(':').map(Number);
    const expectedTotalMinutes = expectedHours * 60 + expectedMinutes;
    const difference = checkTotalMinutes - expectedTotalMinutes;

    if (difference > schedule.toleranceMinutes) {
      // Tarde
      return { 
        isOnTime: false, 
        minutesLate: difference, 
        minutesEarly: 0, 
        status: 'retrasado' as const
      };
    } else if (difference < -30) {
      // Muy temprano (más de 30 minutos antes)
      return { 
        isOnTime: false, 
        minutesLate: 0, 
        minutesEarly: Math.abs(difference), 
        status: 'anticipado' as const
      };
    } else {
      // A tiempo
      return { 
        isOnTime: true, 
        minutesLate: 0, 
        minutesEarly: 0, 
        status: 'a_tiempo' as const
      };
    }
  }

  /**
   * ✅ Validar timing de regreso de comida (duración máxima de 1 hora)
   */
  private static validateLunchReturnTiming(
    schedule: ProductSchedule,
    checkTime: Date,
    lastLunchCheckIn?: Date
  ) {
    if (!lastLunchCheckIn) {
      // Si no hay registro de comida, no podemos validar
      console.warn('No lunch check-in found for lunch return validation');
      return { 
        isOnTime: true, 
        minutesLate: 0, 
        minutesEarly: 0, 
        status: 'a_tiempo' as const
      };
    }

    // ✅ CALCULAR DURACIÓN REAL DE LA COMIDA
    const lunchDurationMs = checkTime.getTime() - lastLunchCheckIn.getTime();
    const actualLunchMinutes = Math.round(lunchDurationMs / 60000);
    
    // ✅ LÍMITE ESTRICTO: duración configurada (típicamente 60 minutos)
    const maxLunchMinutes = schedule.schedule.lunchDuration;

    console.log(`🍽️ Lunch duration: ${actualLunchMinutes}min (max: ${maxLunchMinutes}min)`);

    if (actualLunchMinutes > maxLunchMinutes) {
      // Regreso tarde de comida
      const minutesLate = actualLunchMinutes - maxLunchMinutes;
      return { 
        isOnTime: false, 
        minutesLate, 
        minutesEarly: 0, 
        status: 'retrasado' as const
      };
    } else {
      // Regreso a tiempo
      return { 
        isOnTime: true, 
        minutesLate: 0, 
        minutesEarly: 0, 
        status: 'a_tiempo' as const
      };
    }
  }

  /**
   * ✅ Validar timing de salida
   */
  private static validateExitTiming(
    schedule: ProductSchedule, 
    checkTotalMinutes: number
  ) {
    const [expectedHours, expectedMinutes] = schedule.schedule.exitTime.split(':').map(Number);
    const expectedTotalMinutes = expectedHours * 60 + expectedMinutes;
    const difference = checkTotalMinutes - expectedTotalMinutes;

    if (difference < -60) {
      // Salida muy temprana (más de 1 hora antes)
      return { 
        isOnTime: false, 
        minutesLate: 0, 
        minutesEarly: Math.abs(difference), 
        status: 'anticipado' as const
      };
    } else {
      // Para salidas, normalmente se permite salir a tiempo o tarde
      return { 
        isOnTime: true, 
        minutesLate: Math.max(0, difference), 
        minutesEarly: 0, 
        status: 'a_tiempo' as const
      };
    }
  }

  /**
   * Get all schedules
   */
  static async getAllSchedules(): Promise<ProductSchedule[]> {
    try {
      const schedules: ProductSchedule[] = [];
      const productTypes: ProductType[] = ['BA', 'Aviva_Contigo', 'Casa_Marchand', 'Construrama', 'Disensa'];
      
      for (const productType of productTypes) {
        const schedule = await this.getProductSchedule(productType);
        if (schedule) {
          schedules.push(schedule);
        }
      }
      
      return schedules;
    } catch (error) {
      console.error('Error getting all schedules:', error);
      return [];
    }
  }
}