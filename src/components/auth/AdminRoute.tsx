import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, usePermissions } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth();
  const { isAdmin } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin()) {
    // Redirect non-admin users to employee dashboard
    return <Navigate to="/employee/checkin" replace />;
  }

  return <>{children}</>;
}