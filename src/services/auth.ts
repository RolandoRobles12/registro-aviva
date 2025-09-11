// src/services/auth.ts
import { 
  signInWithPopup, 
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
   * Sign in with Google
   */
  static async signInWithGoogle(): Promise<User> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      // Validate domain
      if (!firebaseUser.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        await firebaseSignOut(auth);
        throw new Error(`Solo se permiten correos del dominio @${ALLOWED_DOMAIN}`);
      }

      // Get or create user document
      const user = await this.getOrCreateUserDocument(firebaseUser);
      
      if (user.status === 'inactive') {
        await firebaseSignOut(auth);
        throw new Error('Tu cuenta está desactivada. Contacta al administrador.');
      }

      return user;
    } catch (error: any) {
      console.error('Error signing in:', error);
      throw new Error(error.message || 'Error al iniciar sesión');
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
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { id: firebaseUser.uid, ...userSnap.data() } as User;
    }

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

    return { id: firebaseUser.uid, ...newUser } as User;
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

  /**
   * Check if user has permission
   */
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

  /**
   * Check if user is admin or super admin
   */
  static isAdmin(user: User | null): boolean {
    return user?.role === 'admin' || user?.role === 'super_admin';
  }

  /**
   * Check if user is super admin
   */
  static isSuperAdmin(user: User | null): boolean {
    return user?.role === 'super_admin';
  }
}