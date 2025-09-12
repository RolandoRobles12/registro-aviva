// src/types/index.ts - Agregar estos nuevos tipos al archivo existente

// ================= SCHEDULE TYPES =================
export interface ProductSchedule {
  id: string;
  productType: ProductType;
  workDays: number[]; // 0=Sunday, 1=Monday, etc.
  schedule: {
    entryTime: string; // "08:00"
    exitTime: string;  // "18:00"
    lunchStartTime: string; // "14:00"
    lunchDuration: number; // minutes (60)
  };
  toleranceMinutes: number;
  worksOnHolidays: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ================= ATTENDANCE TYPES =================
export interface AttendanceIssue {
  id: string;
  userId: string;
  userName: string;
  kioskId?: string;
  kioskName?: string;
  productType: ProductType;
  type: 'no_entry' | 'no_exit' | 'no_lunch_return';
  expectedTime: string;
  detectedAt: Timestamp;
  date: Timestamp;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  resolution?: string;
}

export interface AttendanceStats {
  totalExpected: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalEarly: number;
  attendanceRate: number;
  punctualityRate: number;
}

// Update User interface to include assignedKiosk
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  team?: string;
  slackId?: string;
  status: 'active' | 'inactive';
  assignedKiosk?: string; // Add this
  assignedKioskName?: string; // Add this
  productType?: ProductType; // Add this
  createdAt: Timestamp;
  updatedAt: Timestamp;
}