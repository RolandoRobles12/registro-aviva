// ACTUALIZAR en src/types/index.ts - Solo mostrar los tipos que cambian
import { Timestamp } from 'firebase/firestore'

// ================= SCHEDULE TYPES =================
export interface ProductSchedule {
  id: string
  productType: ProductType
  workDays: number[] // 0=Sunday, 1=Monday, etc.
  schedule: {
    entryTime: string // "08:00"
    exitTime: string  // "18:00"
    lunchStartTime: string // "14:00"
    lunchDuration: number // minutes (60)
  }
  toleranceMinutes: number
  worksOnHolidays: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ================= ATTENDANCE TYPES =================
// ACTUALIZAR: AttendanceIssue con nuevas reglas/campos
export interface AttendanceIssue {
  id: string
  userId: string
  userName: string
  kioskId?: string
  kioskName?: string
  productType: ProductType
  // Se agregan 'late_lunch_return' y 'auto_closed'
  type:
    | 'no_entry'
    | 'no_exit'
    | 'no_lunch_return'
    | 'late_lunch_return'
    | 'auto_closed'
  expectedTime: string
  detectedAt: Timestamp
  date: Timestamp
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: Timestamp
  resolution?: string
  // Nuevos metadatos de la regla
  ruleTriggered?: string   // Qué regla específica se activó
  minutesLate?: number     // Minutos después del límite
}

export interface AttendanceStats {
  totalExpected: number
  totalPresent: number
  totalAbsent: number
  totalLate: number
  totalEarly: number
  attendanceRate: number
  punctualityRate: number
}

// ================= SYSTEM CONFIG =================
// ACTUALIZAR: SystemConfig con nuevas reglas
export interface SystemConfig {
  // Configuraciones existentes
  toleranceMinutes: number
  severeDelayThreshold: number
  defaultRadius: number
  restDay: string

  // NUEVAS: Configuraciones de Inasistencias y Ausencias
  absenceRules?: {
    noEntryAfterMinutes: number    // Default sugerido: 60
    noExitAfterMinutes: number     // Default sugerido: 120
  }

  autoCloseRules?: {
    closeAfterMinutes: number      // Default sugerido: 60
    markAsAbsent: boolean          // Default sugerido: true
  }

  lunchRules?: {
    maxDurationMinutes: number     // Default sugerido: 90
  }

  notificationRules?: {
    notifyOnAbsence: boolean       // Default sugerido: true
    notifyOnLateExit: boolean      // Default sugerido: false
  }

  alertRules?: {
    generateOnIrregularities: boolean // Default sugerido: true
  }

  approvalRules?: {
    requireForLateExit: boolean    // Default sugerido: false
  }

  // Metadatos
  updatedAt: Timestamp
  updatedBy: string
}

// ================= USER (con kiosk/product) =================
// ACTUALIZAR: User para incluir asignaciones de kiosco y producto
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  team?: string
  slackId?: string
  status: 'active' | 'inactive'
  assignedKiosk?: string       // Nuevo
  assignedKioskName?: string   // Nuevo
  productType?: ProductType    // Nuevo
  createdAt: Timestamp
  updatedAt: Timestamp
}