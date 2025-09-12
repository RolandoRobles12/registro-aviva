// src/services/firestore.ts - Servicio completo corregido
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
import { ScheduleService } from './schedules';

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
      console.log('Creating check-in for user:', userId);
      console.log('Kiosk ID from form:', formData.kioskId);

      // Get user and kiosk data - CORREGIDO: usar getKioskById en lugar de getDocument
      const [user, kiosk] = await Promise.all([
        this.getDocument<User>('users', userId),
        this.getKioskById(formData.kioskId) // ✅ Usar método correcto para buscar por ID personalizado
      ]);

      console.log('User found:', !!user, user?.name);
      console.log('Kiosk found:', !!kiosk, kiosk?.name);

      if (!user) {
        throw new Error('Usuario no encontrado. Verifica que tu perfil esté correctamente registrado.');
      }

      if (!kiosk) {
        throw new Error(`Kiosk no encontrado. El kiosk "${formData.kioskId}" no existe o está inactivo.`);
      }

      // Calculate validation results - PASS userId
      const validationResults = await this.validateCheckIn(kiosk, location, formData.type, userId);

      const checkInData: Omit<CheckIn, 'id'> = {
        userId,
        userName: user.name,
        kioskId: formData.kioskId,
        kioskName: kiosk.name,
        productType: kiosk.productType,
        type: formData.type,
        timestamp: serverTimestamp(),
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          ...(location.accuracy !== undefined && { accuracy: location.accuracy }),
      },
        photoUrl,
        notes: formData.notes ?? "", // 👈 FIX aplicado aquí
        status: validationResults.status || this.determineCheckInStatus(validationResults),
        validationResults,
        createdAt: serverTimestamp()
    };

      const docRef = await addDoc(collection(db, 'checkins'), checkInData);
      console.log('Check-in created with ID:', docRef.id);
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
      console.log('Creating time off request for user:', userId);
      
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
      console.log('Time off request created with ID:', docRef.id);
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
   * Get all kiosks (active and inactive)
   */
  static async getAllKiosks(): Promise<Kiosk[]> {
    try {
      console.log('Loading all kiosks...');
      
      // Try with ordering first
      try {
        const q = query(
          collection(db, 'kiosks'),
          orderBy('name', 'asc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          ...doc.data(),
          documentId: doc.id // Mantener ID del documento separado del ID personalizado
        })) as Kiosk[];
      } catch (orderError) {
        console.log('No orderBy index, trying simple query...');
        // If orderBy fails, try without it
        const q = query(collection(db, 'kiosks'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          ...doc.data(),
          documentId: doc.id // Mantener ID del documento separado del ID personalizado
        })) as Kiosk[];
      }
    } catch (error) {
      console.error('Error getting all kiosks:', error);
      throw error;
    }
  }

  /**
   * Get all active kiosks
   */
  static async getActiveKiosks(): Promise<Kiosk[]> {
    try {
      console.log('Loading active kiosks...');
      const allKiosks = await this.getAllKiosks();
      return allKiosks.filter(kiosk => kiosk.status === 'active');
    } catch (error) {
      console.error('Error getting active kiosks:', error);
      throw error;
    }
  }

  /**
   * Get kiosk by custom ID (not document ID) - CORREGIDO
   */
  static async getKioskById(kioskId: string): Promise<Kiosk | null> {
    try {
      console.log('Searching for kiosk with ID:', kioskId);
      
      const q = query(
        collection(db, 'kiosks'),
        where('id', '==', kioskId) // Buscar por el campo 'id' personalizado, no el documento ID
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('No kiosk found with ID:', kioskId);
        return null;
      }
      
      const docSnap = querySnapshot.docs[0];
      const kiosk = {
        ...docSnap.data(),
        documentId: docSnap.id // Mantener referencia al ID del documento para operaciones futuras
      } as Kiosk;
      
      console.log('Kiosk found:', kiosk.name, 'at', kiosk.city);
      return kiosk;
    } catch (error) {
      console.error('Error getting kiosk by ID:', error);
      return null;
    }
  }

  /**
   * Create or update kiosk
   */
  static async saveKiosk(kioskData: Omit<Kiosk, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('Saving kiosk:', kioskData);

      // Validar datos requeridos
      if (!kioskData.id || !kioskData.name || !kioskData.city || !kioskData.state) {
        throw new Error('Faltan campos requeridos: id, name, city, state');
      }

      if (!kioskData.coordinates || 
          typeof kioskData.coordinates.latitude !== 'number' || 
          typeof kioskData.coordinates.longitude !== 'number') {
        throw new Error('Coordenadas inválidas');
      }

      // Verificar si ya existe un kiosko con ese ID
      const existingKiosk = await this.getKioskById(kioskData.id);
      
      if (existingKiosk && existingKiosk.documentId) {
        // Actualizar kiosko existente usando el documentId
        console.log('Updating existing kiosk:', kioskData.id);
        const kioskRef = doc(db, 'kiosks', existingKiosk.documentId);
        await updateDoc(kioskRef, {
          ...kioskData,
          updatedAt: serverTimestamp()
        });
        return existingKiosk.documentId;
      } else {
        // Crear nuevo kiosko
        console.log('Creating new kiosk:', kioskData.id);
        const docRef = await addDoc(collection(db, 'kiosks'), {
          ...kioskData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('Kiosk created with document ID:', docRef.id);
        return docRef.id;
      }
    } catch (error) {
      console.error('Error saving kiosk:', error);
      throw new Error(`Error guardando kiosko: ${error.message}`);
    }
  }

  /**
   * Batch import kiosks
   */
  static async batchImportKiosks(kiosks: Omit<Kiosk, 'createdAt' | 'updatedAt'>[]): Promise<void> {
    try {
      console.log(`Starting batch import of ${kiosks.length} kiosks...`);
      
      const batch = writeBatch(db);
      const timestamp = serverTimestamp();

      for (const kioskData of kiosks) {
        // Validar cada kiosko
        if (!kioskData.id || !kioskData.name || !kioskData.coordinates) {
          console.warn('Skipping invalid kiosk:', kioskData);
          continue;
        }

        // Verificar si ya existe
        const existing = await this.getKioskById(kioskData.id);
        
        if (existing && existing.documentId) {
          // Actualizar existente
          const kioskRef = doc(db, 'kiosks', existing.documentId);
          batch.update(kioskRef, {
            ...kioskData,
            updatedAt: timestamp
          });
        } else {
          // Crear nuevo
          const docRef = doc(collection(db, 'kiosks'));
          batch.set(docRef, {
            ...kioskData,
            createdAt: timestamp,
            updatedAt: timestamp
          });
        }
      }

      await batch.commit();
      console.log('Batch import completed successfully');
    } catch (error) {
      console.error('Error in batch import:', error);
      throw new Error(`Error importando kioscos: ${error.message}`);
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
    checkInType: string,
    userId: string
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

    // Get last lunch check-in if validating lunch return
    let lastLunchCheckIn: Date | undefined;
    if (checkInType === 'regreso_comida') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const q = query(
        collection(db, 'checkins'),
        where('userId', '==', userId),
        where('type', '==', 'comida'),
        where('timestamp', '>=', Timestamp.fromDate(today)),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const lunchData = snapshot.docs[0].data();
        lastLunchCheckIn = lunchData.timestamp.toDate();
      }
    }

    // Validate timing with schedules
    const timingValidation = await ScheduleService.validateCheckInTiming(
      kiosk.productType,
      checkInType,
      new Date(),
      lastLunchCheckIn
    );

    return {
      locationValid,
      distanceFromKiosk: Math.round(distance),
      isOnTime: timingValidation.isOnTime,
      minutesLate: timingValidation.minutesLate,
      minutesEarly: timingValidation.minutesEarly,
      status: timingValidation.status
    };
  }

  /**
   * Determine check-in status based on validation
   */
  private static determineCheckInStatus(validationResults: any): 'a_tiempo' | 'retrasado' | 'anticipado' | 'ubicacion_invalida' {
    if (!validationResults.locationValid) {
      return 'ubicacion_invalida';
    }
    
    // Use the status from validation results if available
    if (validationResults.status) {
      return validationResults.status;
    }
    
    // Fallback logic
    if (validationResults.minutesLate > 0) {
      return 'retrasado';
    }
    
    if (validationResults.minutesEarly > 30) {
      return 'anticipado';
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