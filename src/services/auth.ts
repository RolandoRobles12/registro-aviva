// src/services/auth.ts - UPDATED VERSION
import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';
import { User, UserRole } from '../types';

const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN || 'avivacredito.com';

export class AuthService {
  /**
   * Sign in with Google - with fallback methods
   */
  static async signInWithGoogle(): Promise<User> {
    try {
      console.log('Starting Google sign-in process...');
      
      // First, try popup method
      let result;
      try {
        result = await signInWithPopup(auth, googleProvider);
        console.log('Popup sign-in successful');
      } catch (popupError: any) {
        console.log('Popup failed, trying redirect method:', popupError.code);
        
        // If popup fails due to COOP or popup blocked, use redirect
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.message.includes('Cross-Origin-Opener-Policy')) {
          
          // Use redirect as fallback
          await signInWithRedirect(auth, googleProvider);
          
          // Handle redirect result (this will be handled on page reload)
          const redirectResult = await getRedirectResult(auth);
          if (redirectResult) {
            result = redirectResult;
            console.log('Redirect sign-in successful');
          } else {
            throw new Error('Redirect sign-in in progress...');
          }
        } else {
          throw popupError;
        }
      }
      
      if (!result) {
        throw new Error('No authentication result received');
      }
      
      const firebaseUser = result.user;
      console.log('Firebase user obtained:', firebaseUser.email);
      
      // Validate domain
      if (!firebaseUser.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        await firebaseSignOut(auth);
        throw new Error(`Solo se permiten correos del dominio @${ALLOWED_DOMAIN}`);
      }

      // Get or create user document
      const user = await this.getOrCreateUserDocument(firebaseUser);
      console.log('User document processed:', user.email);
      
      if (user.status === 'inactive') {
        await firebaseSignOut(auth);
        throw new Error('Tu cuenta está desactivada. Contacta al administrador.');
      }

      return user;
    } catch (error: any) {
      console.error('Error signing in:', error);
      
      // Provide more helpful error messages
      if (error.code === 'auth/popup-blocked') {
        throw new Error('El navegador bloqueó la ventana emergente. Por favor permite las ventanas emergentes para este sitio.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Proceso de inicio de sesión cancelado.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Error de conexión. Verifica tu conexión a internet.');
      } else if (error.message?.includes('Cross-Origin-Opener-Policy')) {
        throw new Error('Error de configuración del navegador. Intenta recargar la página o usar un navegador diferente.');
      } else {
        throw new Error(error.message || 'Error al iniciar sesión');
      }
    }
  }

  /**
   * Handle redirect result on page load
   */
  static async handleRedirectResult(): Promise<User | null> {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        const firebaseUser = result.user;
        
        // Validate domain
        if (!firebaseUser.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
          await firebaseSignOut(auth);
          throw new Error(`Solo se permiten correos del dominio @${ALLOWED_DOMAIN}`);
        }

        return await this.getOrCreateUserDocument(firebaseUser);
      }
      return null;
    } catch (error) {
      console.error('Error handling redirect result:', error);
      return null;
    }
  }

  /**
   * Sign out
   */
  static async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw new Error('Error al cerrar sesión');
    }
  }

  /**
   * Get or create user document in Firestore
   */
  private static async getOrCreateUserDocument(firebaseUser: FirebaseUser): Promise<User> {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      console.log('Checking user document for:', firebaseUser.uid);
      
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        console.log('Existing user found');
        return { id: firebaseUser.uid, ...userSnap.data() } as User;
      }

      console.log('Creating new user document');
      
      // Create new user document
      const newUser: Omit<User, 'id'> = {
        email: firebaseUser.email!,
        name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
        role: 'promotor' as UserRole, // Default role
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(userRef, newUser);
      console.log('New user document created');

      return { id: firebaseUser.uid, ...newUser } as User;
    } catch (error) {
      console.error('Error with user document:', error);
      throw error;
    }
  }

  /**
   * Get current user document
   */
  static async getCurrentUserDocument(): Promise<User | null> {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { id: currentUser.uid, ...userSnap.data() } as User;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user document:', error);
      return null;
    }
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Validate domain
        if (!firebaseUser.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
          await firebaseSignOut(auth);
          callback(null);
          return;
        }

        const user = await this.getCurrentUserDocument();
        callback(user);
      } else {
        callback(null);
      }
    });
  }

  // ... rest of the methods remain the same
  static hasPermission(user: User | null, permission: string): boolean {
    if (!user || user.status !== 'active') return false;

    // Super admin has all permissions
    if (user.role === 'super_admin') return true;

    // Define role permissions
    const rolePermissions: Record<UserRole, string[]> = {
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

    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }

  static isAdmin(user: User | null): boolean {
    return user?.role === 'admin' || user?.role === 'super_admin';
  }

  static isSuperAdmin(user: User | null): boolean {
    return user?.role === 'super_admin';
  }
}