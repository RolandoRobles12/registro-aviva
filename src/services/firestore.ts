// src/services/firestore.ts - Fixed version
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  serverTimestamp,
  Timestamp,
  writeBatch,
  onSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  CheckIn, 
  CheckInFormData, 
  TimeOffRequest, 
  TimeOffFormData, 
  Kiosk, 
  User, 
  CheckInFilters,
  TimeOffFilters,
  PaginatedResponse,
  SystemConfig,
  Holiday
} from '../types';

export class FirestoreService {
  
  // ================== CHECKINS ==================
  
  /**
   * Create a new check-in
   */
  static async createCheckIn(
    userId: string, 
    formData: CheckInFormData, 
    location: { latitude: number; longitude: number; accuracy?: number },
    photoUrl?: string
  ): Promise<string> {
    try {
      // Get user and kiosk data
      const [user, kiosk] = await Promise.all([
        this.getDocument<User>('users', userId),
        this.getDocument<Kiosk>('kiosks', formData.kioskId)
      ]);

      if (!user || !kiosk) {
        throw new Error('Usuario o kiosco no encontrado');
      }

      // Calculate validation results
      const validationResults = await this.validateCheckIn(kiosk, location, formData.type);

      const checkInData: Omit<CheckIn, 'id'> = {
        userId,
        userName: user.name,
        kioskId: formData.kioskId,
        kioskName: kiosk.name,
        productType: kiosk.productType,
        type: formData.type,
        timestamp: serverTimestamp(),
        location,
        photoUrl,
        notes: formData.notes,
        status: this.determineCheckInStatus(validationResults),
        validationResults,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'checkins'), checkInData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating check-in:', error);
      throw error;
    }
  }

  /**
   * Get check-ins with filters and pagination
   */
  static async getCheckIns(
    filters?: CheckInFilters,
    page = 1,
    pageSize = 50,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<PaginatedResponse<CheckIn>> {
    try {
      const constraints: QueryConstraint[] = [];

      // Apply filters - Simplified to avoid complex composite indexes
      if (filters?.dateRange) {
        constraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.dateRange.start)));
        constraints.push(where('timestamp', '<=', Timestamp.fromDate(filters.dateRange.end)));
      } else if (filters?.kioskId) {
        constraints.push(where('kioskId', '==', filters.kioskId));
      } else if (filters?.productType) {
        constraints.push(where('productType', '==', filters.productType));
      } else if (filters?.checkInType) {
        constraints.push(where('type', '==', filters.checkInType));
      } else if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
      }

      // Add ordering and pagination
      constraints.push(orderBy('timestamp', 'desc'));
      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      constraints.push(limit(pageSize + 1)); // +1 to check if there's a next page

      const q = query(collection(db, 'checkins'), ...constraints);
      const querySnapshot = await getDocs(q);

      const docs = querySnapshot.docs;
      const hasNext = docs.length > pageSize;
      const dataList = docs.slice(0, pageSize);

      const checkins = dataList.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CheckIn[];

      // Apply additional filters in memory if needed
      let filteredCheckins = checkins;
      
      if (filters?.userName) {
        filteredCheckins = filteredCheckins.filter(c => 
          c.userName.toLowerCase().includes(filters.userName!.toLowerCase())
        );
      }

      return {
        data: filteredCheckins,
        total: 0, // Firestore doesn't provide total count efficiently
        page,
        limit: pageSize,
        hasNext
      };
    } catch (error) {
      console.error('Error getting check-ins:', error);
      throw error;
    }
  }

  /**
   * Get user's check-ins for today
   */
  static async getTodayCheckIns(userId: string): Promise<CheckIn[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const q = query(
        collection(db, 'checkins'),
        where('userId', '==', userId),
        where('timestamp', '>=', Timestamp.fromDate(today)),
        where('timestamp', '<', Timestamp.fromDate(tomorrow)),
        orderBy('timestamp', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CheckIn[];
    } catch (error) {
      console.error('Error getting today check-ins:', error);
      throw error;
    }
  }

  // ================== TIME OFF REQUESTS ==================

  /**
   * Create time off request
   */
  static async createTimeOffRequest(userId: string, formData: TimeOffFormData): Promise<string> {
    try {
      const user = await this.getDocument<User>('users', userId);
      if (!user) throw new Error('Usuario no encontrado');

      const requestData: Omit<TimeOffRequest, 'id'> = {
        userId,
        userName: user.name,
        userEmail: user.email,
        type: formData.type,
        startDate: Timestamp.fromDate(formData.startDate),
        endDate: Timestamp.fromDate(formData.endDate),
        reason: formData.reason,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'time_off_requests'), requestData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating time off request:', error);
      throw error;
    }
  }

  /**
   * Update time off request status
   */
  static async updateTimeOffRequest(
    requestId: string, 
    status: 'approved' | 'rejected', 
    reviewerId: string,
    comment?: string
  ): Promise<void> {
    try {
      const reviewer = await this.getDocument<User>('users', reviewerId);
      if (!reviewer) throw new Error('Revisor no encontrado');

      await updateDoc(doc(db, 'time_off_requests', requestId), {
        status,
        reviewedBy: reviewerId,
        reviewerName: reviewer.name,
        reviewComment: comment,
        reviewedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating time off request:', error);
      throw error;
    }
  }

  /**
   * Get time off requests with simplified filters
   */
  static async getTimeOffRequests(filters?: TimeOffFilters): Promise<TimeOffRequest[]> {
    try {
      const constraints: QueryConstraint[] = [];

      // Only use one WHERE clause at a time to avoid index requirements
      if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
        constraints.push(orderBy('createdAt', 'desc'));
      } else if (filters?.type) {
        constraints.push(where('type', '==', filters.type));
        constraints.push(orderBy('createdAt', 'desc'));
      } else {
        constraints.push(orderBy('createdAt', 'desc'));
      }

      const q = query(collection(db, 'time_off_requests'), ...constraints);
      const querySnapshot = await getDocs(q);

      let requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TimeOffRequest[];

      // Apply additional filters in memory
      if (filters?.userName) {
        requests = requests.filter(r => 
          r.userName.toLowerCase().includes(filters.userName!.toLowerCase())
        );
      }

      if (filters?.dateRange) {
        requests = requests.filter(r => {
          const start = r.startDate.toDate();
          const end = r.endDate.toDate();
          return start >= filters.dateRange!.start && end <= filters.dateRange!.end;
        });
      }

      return requests;
    } catch (error) {
      console.error('Error getting time off requests:', error);
      throw error;
    }
  }

  // ================== KIOSKS ==================

  /**
   * Get all active kiosks
   */
  static async getActiveKiosks(): Promise<Kiosk[]> {
    try {
      const q = query(
        collection(db, 'kiosks'),
        where('status', '==', 'active'),
        orderBy('name')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Kiosk[];
    } catch (error) {
      console.error('Error getting kiosks:', error);
      throw error;
    }
  }

  /**
   * Create or update kiosk
   */
  static async saveKiosk(kioskData: Omit<Kiosk, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      if (kioskData.id) {
        // Update existing
        await updateDoc(doc(db, 'kiosks', kioskData.id), {
          ...kioskData,
          updatedAt: serverTimestamp()
        });
        return kioskData.id;
      } else {
        // Create new
        const docRef = await addDoc(collection(db, 'kiosks'), {
          ...kioskData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return docRef.id;
      }
    } catch (error) {
      console.error('Error saving kiosk:', error);
      throw error;
    }
  }

  /**
   * Batch import kiosks
   */
  static async batchImportKiosks(kiosks: Omit<Kiosk, 'createdAt' | 'updatedAt'>[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      const timestamp = serverTimestamp();

      kiosks.forEach(kioskData => {
        const docRef = doc(collection(db, 'kiosks'));
        batch.set(docRef, {
          ...kioskData,
          createdAt: timestamp,
          updatedAt: timestamp
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error batch importing kiosks:', error);
      throw error;
    }
  }

  // ================== SYSTEM CONFIG ==================

  /**
   * Get system configuration
   */
  static async getSystemConfig(productType?: string): Promise<SystemConfig | null> {
    try {
      const configId = productType || 'global';
      return await this.getDocument<SystemConfig>('system_config', configId);
    } catch (error) {
      console.error('Error getting system config:', error);
      return null;
    }
  }

  /**
   * Update system configuration
   */
  static async updateSystemConfig(
    configData: Partial<SystemConfig>, 
    productType?: string,
    updatedBy?: string
  ): Promise<void> {
    try {
      const configId = productType || 'global';
      await updateDoc(doc(db, 'system_config', configId), {
        ...configData,
        updatedAt: serverTimestamp(),
        updatedBy: updatedBy || 'system'
      });
    } catch (error) {
      console.error('Error updating system config:', error);
      throw error;
    }
  }

  // ================== HOLIDAYS ==================

  /**
   * Get holidays for current year
   */
  static async getHolidays(year?: number): Promise<Holiday[]> {
    try {
      const currentYear = year || new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear, 11, 31);

      const q = query(
        collection(db, 'holidays'),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Holiday[];
    } catch (error) {
      console.error('Error getting holidays:', error);
      throw error;
    }
  }

  // ================== GENERIC OPERATIONS ==================

  /**
   * Get single document
   */
  static async getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error(`Error getting document from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Listen to document changes
   */
  static listenToDocument<T>(
    collectionName: string, 
    docId: string, 
    callback: (data: T | null) => void
  ): () => void {
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as T);
      } else {
        callback(null);
      }
    });
  }

  // ================== PRIVATE HELPERS ==================

  /**
   * Validate check-in location and timing
   */
  private static async validateCheckIn(
    kiosk: Kiosk, 
    location: { latitude: number; longitude: number },
    checkInType: string
  ) {
    const distance = this.calculateDistance(
      location.latitude,
      location.longitude,
      kiosk.coordinates.latitude,
      kiosk.coordinates.longitude
    );

    const config = await this.getSystemConfig(kiosk.productType) || 
                   await this.getSystemConfig('global');
    
    const allowedRadius = kiosk.radiusOverride || config?.defaultRadius || 150;
    const locationValid = distance <= allowedRadius;

    // For now, simplified timing validation
    // TODO: Implement proper business hours validation
    const isOnTime = true; // Will be implemented with business rules
    const minutesLate = 0;

    return {
      locationValid,
      distanceFromKiosk: Math.round(distance),
      isOnTime,
      minutesLate
    };
  }

  /**
   * Determine check-in status based on validation
   */
  private static determineCheckInStatus(validationResults: any): 'a_tiempo' | 'retrasado' | 'anticipado' | 'ubicacion_invalida' {
    if (!validationResults.locationValid) {
      return 'ubicacion_invalida';
    }
    
    if (validationResults.minutesLate > 0) {
      return 'retrasado';
    }
    
    return 'a_tiempo';
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }
}