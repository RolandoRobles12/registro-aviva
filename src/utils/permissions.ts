import { User, UserRole } from '../types';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ['*'], // All permissions
  admin: [
    'manage_users',
    'manage_kiosks',
    'manage_teams',
    'approve_time_off',
    'view_reports',
    'perform_checkin'
  ],
  supervisor: [
    'view_reports',
    'approve_time_off',
    'perform_checkin'
  ],
  promotor: [
    'perform_checkin'
  ]
};

export function hasPermission(user: User | null, permission: string): boolean {
  if (!user || user.status !== 'active') return false;
  
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes('*') || permissions.includes(permission);
}

export function canAccessAdmin(user: User | null): boolean {
  return hasPermission(user, 'manage_users') || 
         hasPermission(user, 'view_reports') || 
         hasPermission(user, 'approve_time_off');
}

export function canManageUsers(user: User | null): boolean {
  return hasPermission(user, 'manage_users');
}

export function canApproveTimeOff(user: User | null): boolean {
  return hasPermission(user, 'approve_time_off');
}