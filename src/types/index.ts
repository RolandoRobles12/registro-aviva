// src/types/index.ts
import { Timestamp } from 'firebase/firestore';

// ================= AUTH TYPES =================
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  team?: string;
  slackId?: string;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type UserRole = 'super_admin' | 'admin' | 'supervisor' | 'promotor';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

// ================= KIOSK TYPES =================
export interface Kiosk {
  id: string; // Format: 0001, 0002, etc.
  name: string;
  city: string;
  state: string;
  productType: ProductType;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  radiusOverride?: number; // meters
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ProductType = 'BA' | 'Aviva_Contigo' | 'Casa_Marchand' | 'Construrama' | 'Disensa';

// ================= CHECK-IN TYPES =================
export interface CheckIn {
  id: string;
  userId: string;
  userName: string;
  kioskId: string;
  kioskName: string;
  productType: ProductType;
  type: CheckInType;
  timestamp: Timestamp;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  photoUrl?: string;
  notes?: string;
  status: CheckInStatus;
  validationResults: {
    locationValid: boolean;
    distanceFromKiosk: number;
    isOnTime: boolean;
    minutesLate?: number;
  };
  createdAt: Timestamp;
}

export type CheckInType = 'entrada' | 'comida' | 'regreso_comida' | 'salida';

export type CheckInStatus = 'a_tiempo' | 'retrasado' | 'anticipado' | 'ubicacion_invalida';

export interface CheckInFormData {
  kioskId: string;
  type: CheckInType;
  notes?: string;
}

// ================= TIME OFF TYPES =================
export interface TimeOffRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: TimeOffType;
  startDate: Timestamp;
  endDate: Timestamp;
  reason?: string;
  status: RequestStatus;
  reviewedBy?: string;
  reviewerName?: string;
  reviewComment?: string;
  reviewedAt?: Timestamp;
  createdAt: Timestamp;
}

export type TimeOffType = 'vacaciones' | 'aviva_day' | 'incapacidad';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface TimeOffFormData {
  type: TimeOffType;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

// ================= TEAM TYPES =================
export interface Team {
  id: string;
  name: string;
  type: 'state' | 'product';
  members: string[]; // User IDs
  supervisor?: string; // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ================= ROLE & PERMISSIONS =================
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type Permission = 
  | 'manage_all'
  | 'manage_users'
  | 'manage_kiosks'
  | 'manage_teams'
  | 'approve_time_off'
  | 'view_reports'
  | 'perform_checkin';

// ================= SYSTEM CONFIG =================
export interface SystemConfig {
  id: string; // productType or 'global'
  toleranceMinutes: number;
  severeDelayThreshold: number;
  defaultRadius: number;
  restDay: string; // 'sunday', 'monday', etc.
  updatedAt: Timestamp;
  updatedBy: string;
}

// ================= BUSINESS RULES =================
export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  scope: 'global' | 'product' | 'kiosk_user';
  targetId?: string; // productType, kioskId, or userId
  status: 'active' | 'inactive';
  conditions: RuleCondition[];
  actions: RuleAction[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RuleCondition {
  field: 'check_in_type' | 'time_of_day' | 'gps_distance' | 'has_photo' | 'minutes_late';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal';
  value: string | number;
}

export interface RuleAction {
  type: 'assign_status' | 'add_late_minutes' | 'require_comment' | 'notify' | 'notify_slack';
  value: string;
  target?: 'supervisor' | 'admin' | 'user' | 'slack';
}

// ================= HOLIDAYS =================
export interface Holiday {
  id: string;
  name: string;
  date: Timestamp;
  type: 'official' | 'corporate';
  productTypes?: ProductType[]; // If undefined, applies to all
  createdAt: Timestamp;
}

// ================= STATISTICS =================
export interface UserStats {
  userId: string;
  userName: string;
  totalCheckins: number;
  onTimeCount: number;
  lateCount: number;
  earlyCount: number;
  invalidLocationCount: number;
  punctualityPercentage: number;
  avgHoursWorked: number;
}

export interface KioskStats {
  kioskId: string;
  kioskName: string;
  totalCheckins: number;
  onTimeCount: number;
  lateCount: number;
  punctualityPercentage: number;
  avgDailyCheckins: number;
}

export interface SystemKPIs {
  totalCheckins: number;
  punctualityPercentage: number;
  locationAccuracyPercentage: number;
  totalIncidents: number;
  avgHoursWorked: number;
}

// ================= FILTERS =================
export interface CheckInFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  userName?: string;
  kioskId?: string;
  productType?: ProductType;
  checkInType?: CheckInType;
  status?: CheckInStatus;
  state?: string;
  city?: string;
}

export interface TimeOffFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: RequestStatus;
  type?: TimeOffType;
  userName?: string;
}

// ================= API RESPONSES =================
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// ================= FORM STATES =================
export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  isValid: boolean;
}

// ================= GEOLOCATION =================
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface LocationPermission {
  granted: boolean;
  error?: string;
}

// ================= CAMERA =================
export interface CameraCapture {
  file: File;
  blob: Blob;
  dataUrl: string;
}

export interface CameraOptions {
  facingMode: 'user' | 'environment';
  width?: number;
  height?: number;
  quality?: number;
}