// ACTUALIZAR src/utils/constants.ts - REMOVER DEFAULT_SYSTEM_CONFIG

export const PRODUCT_TYPES = {
  BA: 'Bodega Aurrera',
  Aviva_Contigo: 'Aviva Contigo',
  Casa_Marchand: 'Casa Marchand',
  Construrama: 'Construrama',
  Disensa: 'Disensa'
} as const;

export const CHECK_IN_TYPES = {
  entrada: 'Entrada',
  comida: 'Comida',
  regreso_comida: 'Regreso de Comida',
  salida: 'Salida'
} as const;

export const CHECK_IN_STATUS = {
  a_tiempo: 'A Tiempo',
  retrasado: 'Retrasado',
  anticipado: 'Anticipado',
  ubicacion_invalida: 'Ubicación Inválida'
} as const;

export const TIME_OFF_TYPES = {
  vacaciones: 'Vacaciones',
  aviva_day: 'Aviva Day',
  incapacidad: 'Incapacidad'
} as const;

export const REQUEST_STATUS = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado'
} as const;

export const USER_ROLES = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  promotor: 'Promotor'
} as const;

export const MEXICAN_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Coahuila', 'Colima', 'Chiapas', 'Chihuahua', 'Ciudad de México',
  'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
  'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León',
  'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
  'Veracruz', 'Yucatán', 'Zacatecas'
];


// ✅ Solo mantener constantes que realmente no cambian
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const GPS_ACCURACY_THRESHOLD = 100; // metros