import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

export function formatTimestamp(timestamp: Timestamp | Date): string {
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
  
  if (isToday(date)) {
    return `Hoy a las ${format(date, 'HH:mm', { locale: es })}`;
  }
  
  if (isYesterday(date)) {
    return `Ayer a las ${format(date, 'HH:mm', { locale: es })}`;
  }
  
  return format(date, "d 'de' MMMM 'a las' HH:mm", { locale: es });
}

export function formatDate(date: Date | Timestamp): string {
  const d = date instanceof Timestamp ? date.toDate() : date;
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function formatTime(date: Date | Timestamp): string {
  const d = date instanceof Timestamp ? date.toDate() : date;
  return format(d, 'HH:mm', { locale: es });
}

export function formatRelativeTime(date: Date | Timestamp): string {
  const d = date instanceof Timestamp ? date.toDate() : date;
  return formatDistanceToNow(d, { locale: es, addSuffix: true });
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}