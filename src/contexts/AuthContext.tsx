// src/contexts/AuthContext.tsx - UPDATED VERSION
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import { AuthService } from '../services/auth';
import { JobService } from '../services/jobs';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle redirect result first (if any)
    const handleInitialAuth = async () => {
      try {
        // Check for redirect result
        const redirectUser = await AuthService.handleRedirectResult();
        if (redirectUser) {
          setUser(redirectUser);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error handling redirect:', error);
      }

      // Set up auth state listener
      const unsubscribe = AuthService.onAuthStateChanged((user) => {
        setUser(user);
        setLoading(false);
      });

      return unsubscribe;
    };

    const unsubscribe = handleInitialAuth();

    // Cleanup function
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else if (unsubscribe instanceof Promise) {
        unsubscribe.then(fn => fn && fn());
      }
    };
  }, []);

  // Initialize background jobs when user is authenticated and is admin
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      console.log('🚀 Starting background jobs for admin user...');
      JobService.startBackgroundJobs().catch(err => {
        console.error('Failed to start background jobs:', err);
      });
    }

    // Cleanup: stop jobs when user logs out or component unmounts
    return () => {
      if (user && (user.role === 'admin' || user.role === 'super_admin')) {
        JobService.stopBackgroundJobs();
      }
    };
  }, [user]);

  const signInWithGoogle = async (): Promise<void> => {
    try {
      setLoading(true);
      const user = await AuthService.signInWithGoogle();
      setUser(user);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await AuthService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for checking permissions
export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    return AuthService.hasPermission(user, permission);
  };

  const isAdmin = (): boolean => {
    return AuthService.isAdmin(user);
  };

  const isSuperAdmin = (): boolean => {
    return AuthService.isSuperAdmin(user);
  };

  return {
    hasPermission,
    isAdmin,
    isSuperAdmin,
  };
}