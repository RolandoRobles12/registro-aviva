import { z } from 'zod';

export const checkInSchema = z.object({
  kioskId: z.string().min(1, 'Debes seleccionar un kiosco'),
  type: z.enum(['entrada', 'comida', 'regreso_comida', 'salida']),
  notes: z.string().optional()
});

export const timeOffRequestSchema = z.object({
  type: z.enum(['vacaciones', 'aviva_day', 'incapacidad']),
  startDate: z.date(),
  endDate: z.date(),
  reason: z.string().optional()
}).refine((data) => {
  if (data.type === 'aviva_day') {
    // Aviva Day must be single day
    return data.startDate.toDateString() === data.endDate.toDateString();
  }
  if (data.type === 'incapacidad') {
    // Incapacidad requires reason
    return Boolean(data.reason?.trim());
  }
  return data.endDate >= data.startDate;
}, {
  message: 'Fechas o datos inválidos'
});

export const kioskSchema = z.object({
  id: z.string().regex(/^\d{4}$/, 'ID debe ser de 4 dígitos'),
  name: z.string().min(1, 'Nombre es requerido'),
  city: z.string().min(1, 'Ciudad es requerida'),
  state: z.string().min(1, 'Estado es requerido'),
  productType: z.enum(['BA', 'Aviva_Contigo', 'Aviva_Tu_Negocio', 'Casa_Marchand', 'Construrama', 'Disensa']),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }),
  radiusOverride: z.number().min(50).max(1000).optional(),
  status: z.enum(['active', 'inactive'])
});

export const userSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  email: z.string().email('Email inválido').endsWith('@avivacredito.com', 'Debe ser email corporativo'),
  role: z.enum(['super_admin', 'admin', 'supervisor', 'promotor']),
  team: z.string().optional(),
  slackId: z.string().optional()
});

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.endsWith('@avivacredito.com');
}

export function validateKioskId(id: string): boolean {
  return /^\d{4}$/.test(id);
}

export function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}