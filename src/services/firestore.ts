// src/services/firestore.ts - Servicio completo optimizado y mejorado
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
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
  QueryConstraint,
  runTransaction
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

/**
 * Main Firestore service class with optimized queries and error handling
 */
export class FirestoreService {
  
  // ================== CHECK-INS WITH OPTIMIZED FILTERING ==================
  
  /**
   * Get check-ins with intelligent filtering and fallback strategies
   */
  static async getCheckIns(
    filters?: CheckInFilters,
    page = 1,
    pageSize = 50,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<PaginatedResponse<CheckIn>> {
    try {
      console.log('🔍 Loading check-ins with filters:', filters);
      
      // Strategy: Use single indexed field + in-memory filtering
      const queryResult = await this.buildOptimizedCheckInsQuery(filters, pageSize, lastDoc);
      
      // Apply secondary filters in memory
      const filteredData = await this.applySecondaryFilters(queryResult.data, filters);
      
      // Handle pagination after filtering
      const paginatedData = filteredData.slice(0, pageSize);
      const hasNext = filteredData.length > pageSize || queryResult.hasMoreFromQuery;

      console.log(`✅ Returning ${paginatedData.length} filtered check-ins, hasNext: ${hasNext}`);

      return {
        data: paginatedData,
        total: filteredData.length, // Approximate count
        page,
        limit: pageSize,
        hasNext,
        lastDoc: queryResult.lastDoc
      };

    } catch (error: any) {
      console.error('❌ Error getting check-ins:', error);
      
      // Fallback to simple query if indexed query fails
      if (this.isIndexError(error)) {
        console.warn('🔄 Using fallback query due to index issues');
        return this.getFallbackCheckIns(filters, page, pageSize, lastDoc);
      }
      
      throw new Error(`Error loading check-ins: ${error.message}`);
    }
  }

  /**
   * Build optimized query based on filter priority
   */
  private static async buildOptimizedCheckInsQuery(
    filters?: CheckInFilters,
    pageSize = 50,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{
    data: CheckIn[];
    lastDoc?: QueryDocumentSnapshot<DocumentData>;
    hasMoreFromQuery: boolean;
    queryType: string;
  }> {
    const constraints: QueryConstraint[] = [];
    let queryType = 'default';

    // Priority-based query selection (only one indexed field at a time)
    if (filters?.dateRange?.start || filters?.dateRange?.end) {
      // Soporte para rangos parciales o completos
      if (filters.dateRange.start && filters.dateRange.end) {
        // Rango completo
        constraints.push(
          where('timestamp', '>=', Timestamp.fromDate(filters.dateRange.start)),
          where('timestamp', '<=', Timestamp.fromDate(filters.dateRange.end)),
          orderBy('timestamp', 'desc')
        );
      } else if (filters.dateRange.start) {
        // Solo fecha inicial - desde esta fecha en adelante
        constraints.push(
          where('timestamp', '>=', Timestamp.fromDate(filters.dateRange.start)),
          orderBy('timestamp', 'desc')
        );
      } else if (filters.dateRange.end) {
        // Solo fecha final - hasta esta fecha
        constraints.push(
          where('timestamp', '<=', Timestamp.fromDate(filters.dateRange.end)),
          orderBy('timestamp', 'desc')
        );
      }
      queryType = 'dateRange';

    } else if (filters?.kioskId) {
      constraints.push(
        where('kioskId', '==', filters.kioskId),
        orderBy('timestamp', 'desc')
      );
      queryType = 'kioskId';
      
    } else if (filters?.productType) {
      constraints.push(
        where('productType', '==', filters.productType),
        orderBy('timestamp', 'desc')
      );
      queryType = 'productType';
      
    } else if (filters?.status) {
      constraints.push(
        where('status', '==', filters.status),
        orderBy('timestamp', 'desc')
      );
      queryType = 'status';
      
    } else if (filters?.checkInType) {
      constraints.push(
        where('type', '==', filters.checkInType),
        orderBy('timestamp', 'desc')
      );
      queryType = 'checkInType';
      
    } else {
      constraints.push(orderBy('timestamp', 'desc'));
      queryType = 'default';
    }

    // Add pagination
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    
    // Load extra documents to compensate for in-memory filtering
    const queryLimit = this.calculateQueryLimit(filters, pageSize);
    constraints.push(limit(queryLimit));

    console.log(`📊 Query type: ${queryType}, limit: ${queryLimit}`);

    // Execute query
    const q = query(collection(db, 'checkins'), ...constraints);
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs;

    const data = docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CheckIn[];

    const hasMoreFromQuery = docs.length === queryLimit;
    const lastDocument = docs.length > 0 ? docs[docs.length - 1] : undefined;

    return {
      data,
      lastDoc: lastDocument,
      hasMoreFromQuery,
      queryType
    };
  }

  /**
   * Calculate optimal query limit based on expected filtering
   */
  private static calculateQueryLimit(filters?: CheckInFilters, pageSize = 50): number {
    let multiplier = 1;
    
    // Increase multiplier based on filters that will be applied in memory
    if (filters?.userName) multiplier += 0.5;
    if (filters?.state || filters?.city) multiplier += 1; // Geographic filters need kiosk join
    
    // Cap the multiplier to avoid excessive data loading
    multiplier = Math.min(multiplier, 3);
    
    return Math.ceil(pageSize * multiplier) + 1; // +1 for hasNext detection
  }

  /**
   * Apply secondary filters in memory (non-indexed fields)
   */
  private static async applySecondaryFilters(
    checkins: CheckIn[], 
    filters?: CheckInFilters
  ): Promise<CheckIn[]> {
    if (!filters) return checkins;

    let filtered = [...checkins];
    let kioskMap: Map<string, Kiosk> | undefined;

    // Text search filter
    if (filters.userName?.trim()) {
      const searchTerm = filters.userName.toLowerCase().trim();
      filtered = filtered.filter(c => 
        c.userName.toLowerCase().includes(searchTerm)
      );
      console.log(`🔍 User name filter: ${filtered.length} remaining`);
    }

    // Geographic filters and hub filter (require kiosk data)
    if (filters.state || filters.city || filters.hubId) {
      console.log('🔗 Loading kiosk data for geographic/hub filtering...');
      kioskMap = await this.loadKioskMap();

      if (filters.state) {
        filtered = filtered.filter(c => {
          const kiosk = kioskMap!.get(c.kioskId);
          return kiosk?.state === filters.state;
        });
        console.log(`🗺️ State filter (${filters.state}): ${filtered.length} remaining`);
      }

      if (filters.city) {
        filtered = filtered.filter(c => {
          const kiosk = kioskMap!.get(c.kioskId);
          return kiosk?.city === filters.city;
        });
        console.log(`🏙️ City filter (${filters.city}): ${filtered.length} remaining`);
      }

      if (filters.hubId) {
        console.log(`🏢 Applying Hub filter: ${filters.hubId}`);
        console.log(`  - Total kiosks in map: ${kioskMap!.size}`);

        // Debug: Mostrar hubIds únicos en los kiosks
        const hubIds = new Set<string>();
        kioskMap!.forEach(kiosk => {
          if (kiosk.hubId) hubIds.add(kiosk.hubId);
        });
        console.log(`  - Unique hubIds found in kiosks:`, Array.from(hubIds));

        // Contar cuántos kiosks tienen el hubId buscado
        const kiosksWithTargetHub = Array.from(kioskMap!.values()).filter(k => k.hubId === filters.hubId);
        console.log(`  - Kiosks with target hubId '${filters.hubId}': ${kiosksWithTargetHub.length}`);
        if (kiosksWithTargetHub.length > 0) {
          console.log(`    Examples:`, kiosksWithTargetHub.slice(0, 3).map(k => `${k.id} (${k.name})`));
        }

        const beforeHubFilter = filtered.length;
        const debugLimit = 5;
        let debugCount = 0;

        filtered = filtered.filter(c => {
          const kiosk = kioskMap!.get(c.kioskId);
          const matches = kiosk?.hubId === filters.hubId;

          if (import.meta.env.DEV && debugCount < debugLimit) {
            console.log(`  ${matches ? '✅' : '❌'} Check-in from kiosk ${c.kioskId} (${kiosk?.name || 'unknown'}): hubId=${kiosk?.hubId || 'NONE'}, matches=${matches}`);
            debugCount++;
          }

          return matches;
        });

        console.log(`🏢 Hub filter result: ${beforeHubFilter} → ${filtered.length} (${beforeHubFilter - filtered.length} filtered out)`);

        if (filtered.length === 0 && beforeHubFilter > 0) {
          console.warn(`⚠️ WARNING: No check-ins found for hub '${filters.hubId}'`);
          console.warn(`  Possible issues:`);
          console.warn(`  1. Kiosks might not have hubId assigned in database`);
          console.warn(`  2. No check-ins exist from kiosks with this hubId`);
          console.warn(`  3. Hub ID might be incorrect (check spelling/case)`);
        }
      }
    }

    return filtered;
  }

  /**
   * Load kiosk data for geographic filtering
   */
  private static async loadKioskMap(): Promise<Map<string, Kiosk>> {
    try {
      const kiosks = await this.getAllKiosks();
      const kioskMap = new Map<string, Kiosk>();
      
      kiosks.forEach(kiosk => {
        kioskMap.set(kiosk.id, kiosk);
      });
      
      console.log(`📍 Loaded ${kioskMap.size} kiosks for filtering`);
      return kioskMap;
    } catch (error) {
      console.error('Error loading kiosk map:', error);
      return new Map();
    }
  }

  /**
   * Fallback query when indexed queries fail
   */
  private static async getFallbackCheckIns(
    filters?: CheckInFilters,
    page = 1,
    pageSize = 50,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<PaginatedResponse<CheckIn>> {
    try {
      console.log('🔄 Using fallback query with simple timestamp ordering');
      
      const constraints = [
        orderBy('timestamp', 'desc'),
        limit(pageSize * 2) // Load more to compensate for memory filtering
      ];
      
      if (lastDoc) {
        constraints.splice(1, 0, startAfter(lastDoc));
      }

      const fallbackQuery = query(collection(db, 'checkins'), ...constraints);
      const snapshot = await getDocs(fallbackQuery);
      const docs = snapshot.docs;

      let checkins = docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CheckIn[];

      // Apply all filters in memory
      checkins = await this.applyAllFiltersInMemory(checkins, filters);

      // Paginate after filtering
      const paginatedData = checkins.slice(0, pageSize);
      const hasNext = checkins.length > pageSize;

      console.log(`🔄 Fallback query returned ${paginatedData.length} check-ins`);

      return {
        data: paginatedData,
        total: checkins.length,
        page,
        limit: pageSize,
        hasNext,
        lastDoc: docs.length > 0 ? docs[Math.min(docs.length - 1, pageSize - 1)] : undefined
      };
    } catch (fallbackError) {
      console.error('❌ Fallback query failed:', fallbackError);
      throw new Error('Unable to load check-ins. Please check database configuration.');
    }
  }

  /**
   * Apply all filters in memory (for fallback scenarios)
   */
  private static async applyAllFiltersInMemory(
    checkins: CheckIn[], 
    filters?: CheckInFilters
  ): Promise<CheckIn[]> {
    if (!filters) return checkins;

    let filtered = [...checkins];

    // Apply each filter
    const filterOperations = [
      () => this.filterByUserName(filtered, filters.userName),
      () => this.filterByKioskId(filtered, filters.kioskId),
      () => this.filterByProductType(filtered, filters.productType),
      () => this.filterByStatus(filtered, filters.status),
      () => this.filterByCheckInType(filtered, filters.checkInType),
      () => this.filterByDateRange(filtered, filters.dateRange),
    ];

    for (const operation of filterOperations) {
      filtered = operation();
    }

    // Geographic filters (async)
    if (filters.state || filters.city) {
      const kioskMap = await this.loadKioskMap();
      if (filters.state) {
        filtered = this.filterByState(filtered, filters.state, kioskMap);
      }
      if (filters.city) {
        filtered = this.filterByCity(filtered, filters.city, kioskMap);
      }
    }

    return filtered;
  }

  // Filter helper methods
  private static filterByUserName(checkins: CheckIn[], userName?: string): CheckIn[] {
    if (!userName?.trim()) return checkins;
    const searchTerm = userName.toLowerCase().trim();
    return checkins.filter(c => c.userName.toLowerCase().includes(searchTerm));
  }

  private static filterByKioskId(checkins: CheckIn[], kioskId?: string): CheckIn[] {
    if (!kioskId) return checkins;
    return checkins.filter(c => c.kioskId === kioskId);
  }

  private static filterByProductType(checkins: CheckIn[], productType?: string): CheckIn[] {
    if (!productType) return checkins;
    return checkins.filter(c => c.productType === productType);
  }

  private static filterByStatus(checkins: CheckIn[], status?: string): CheckIn[] {
    if (!status) return checkins;
    return checkins.filter(c => c.status === status);
  }

  private static filterByCheckInType(checkins: CheckIn[], checkInType?: string): CheckIn[] {
    if (!checkInType) return checkins;
    return checkins.filter(c => c.type === checkInType);
  }

  private static filterByDateRange(checkins: CheckIn[], dateRange?: { start: Date; end: Date }): CheckIn[] {
    if (!dateRange?.start || !dateRange?.end) return checkins;
    return checkins.filter(c => {
      const checkInDate = c.timestamp.toDate();
      return checkInDate >= dateRange.start && checkInDate <= dateRange.end;
    });
  }

  private static filterByState(checkins: CheckIn[], state: string, kioskMap: Map<string, Kiosk>): CheckIn[] {
    return checkins.filter(c => {
      const kiosk = kioskMap.get(c.kioskId);
      return kiosk?.state === state;
    });
  }

  private static filterByCity(checkins: CheckIn[], city: string, kioskMap: Map<string, Kiosk>): CheckIn[] {
    return checkins.filter(c => {
      const kiosk = kioskMap.get(c.kioskId);
      return kiosk?.city === city;
    });
  }

  /**
   * Check if error is related to missing Firestore indexes
   */
  private static isIndexError(error: any): boolean {
    return error.code === 'failed-precondition' || 
           error.message?.includes('index') ||
           error.message?.includes('requires an index');
  }

  /**
   * Create a new check-in with transaction safety
   */
  static async createCheckIn(
    userId: string,
    formData: CheckInFormData,
    location: { latitude: number; longitude: number; accuracy?: number },
    photoUrl?: string
  ): Promise<string> {
    try {
      console.log('Creating check-in for user:', userId);

      let user: User;
      let kiosk: Kiosk;
      let config: SystemConfig;

      // Use transaction to ensure data consistency
      const result = await runTransaction(db, async (transaction) => {
        // Get user and kiosk data
        const userDoc = await transaction.get(doc(db, 'users', userId));
        if (!userDoc.exists()) {
          throw new Error('User not found. Please check your profile registration.');
        }

        user = { id: userDoc.id, ...userDoc.data() } as User;

        // Get kiosk
        kiosk = await this.getKioskById(formData.kioskId);
        if (!kiosk) {
          throw new Error(`Kiosk "${formData.kioskId}" not found or inactive.`);
        }

        // Validate check-in
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
          notes: formData.notes ?? "",
          status: validationResults.status || this.determineCheckInStatus(validationResults),
          validationResults,
          createdAt: serverTimestamp()
        };

        // Create check-in document
        const docRef = doc(collection(db, 'checkins'));
        transaction.set(docRef, checkInData);

        return docRef.id;
      });

      console.log('Check-in created with ID:', result);

      // ========== MOTOR DE ACCIONES DE PUNTUALIDAD ==========
      // Ejecutar acciones después de la transacción para evitar conflictos
      try {
        // Obtener el check-in recién creado
        const checkInDoc = await this.getDocument<CheckIn>('checkins', result);
        if (checkInDoc) {
          // Obtener configuración del sistema
          config = await this.getSystemConfig(kiosk.productType);

          // Verificar si se requiere comentario pero no se proporcionó
          const { PunctualityActionEngine } = await import('./punctualityActionEngine');

          // Validar comentario obligatorio
          if (checkInDoc.status === 'retrasado' ||
              (checkInDoc.status === 'anticipado' && checkInDoc.type === 'salida')) {
            const commentRules = config.commentRules || {};
            const minLength = commentRules.minCommentLength || 10;

            const requiresComment = (
              (checkInDoc.status === 'retrasado' && checkInDoc.type === 'entrada' && commentRules.requireOnLateArrival !== false) ||
              (checkInDoc.status === 'retrasado' && checkInDoc.type === 'regreso_comida' && commentRules.requireOnLongLunch !== false) ||
              (checkInDoc.status === 'anticipado' && checkInDoc.type === 'salida' && commentRules.requireOnEarlyDeparture !== false)
            );

            if (requiresComment && (!formData.notes || formData.notes.trim().length < minLength)) {
              // Eliminar el check-in creado si no cumple con el requisito de comentario
              await this.deleteDocument('checkins', result);
              throw new Error(
                `Se requiere un comentario de al menos ${minLength} caracteres para este tipo de registro. ` +
                `Tu ${checkInDoc.type === 'entrada' ? 'entrada' : checkInDoc.type === 'regreso_comida' ? 'regreso de comida' : 'salida'} ` +
                `se registró con ${checkInDoc.validationResults?.minutesLate || 0} minuto(s) de retraso.`
              );
            }
          }

          // Ejecutar el motor de acciones de puntualidad
          const actionResult = await PunctualityActionEngine.executeActions(
            checkInDoc,
            user,
            config
          );

          console.log('✅ Punctuality actions executed:', actionResult);
        }
      } catch (actionError) {
        // Si es error de comentario requerido, propagarlo
        if (actionError instanceof Error && actionError.message.includes('Se requiere un comentario')) {
          throw actionError;
        }
        // No fallar la creación del check-in si las acciones fallan
        console.error('⚠️ Error executing punctuality actions (check-in created successfully):', actionError);
      }

      return result;
    } catch (error) {
      console.error('Error creating check-in:', error);
      throw error;
    }
  }

  /**
   * Update an existing check-in
   */
  static async updateCheckIn(
    checkInId: string,
    updates: Partial<CheckIn>
  ): Promise<void> {
    try {
      console.log('Updating check-in:', checkInId, updates);
      const checkInRef = doc(db, 'checkins', checkInId);
      await updateDoc(checkInRef, updates);
      console.log('Check-in updated successfully');
    } catch (error) {
      console.error('Error updating check-in:', error);
      throw error;
    }
  }

  /**
   * Get user's check-ins for today with caching
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
   * Create time off request with validation
   */
  static async createTimeOffRequest(userId: string, formData: TimeOffFormData): Promise<string> {
    try {
      console.log('Creating time off request for user:', userId);
      
      const user = await this.getDocument<User>('users', userId);
      if (!user) throw new Error('User not found');

      // Validate date range
      if (formData.startDate >= formData.endDate) {
        throw new Error('End date must be after start date');
      }

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
   * Update time off request status with transaction
   */
  static async updateTimeOffRequest(
    requestId: string, 
    status: 'approved' | 'rejected', 
    reviewerId: string,
    comment?: string
  ): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const reviewerDoc = await transaction.get(doc(db, 'users', reviewerId));
        if (!reviewerDoc.exists()) {
          throw new Error('Reviewer not found');
        }

        const reviewer = { id: reviewerDoc.id, ...reviewerDoc.data() } as User;

        const requestRef = doc(db, 'time_off_requests', requestId);
        transaction.update(requestRef, {
          status,
          reviewedBy: reviewerId,
          reviewerName: reviewer.name,
          reviewComment: comment,
          reviewedAt: serverTimestamp()
        });
      });
    } catch (error) {
      console.error('Error updating time off request:', error);
      throw error;
    }
  }

  /**
   * Get time off requests with optimized filtering
   */
  static async getTimeOffRequests(filters?: TimeOffFilters): Promise<TimeOffRequest[]> {
    try {
      const constraints: QueryConstraint[] = [];

      // Use single indexed field to avoid complex index requirements
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
   * Get all kiosks with error handling
   */
  static async getAllKiosks(): Promise<Kiosk[]> {
    try {
      console.log('Loading all kiosks...');
      
      // Try with ordering first, fallback to simple query
      try {
        const q = query(
          collection(db, 'kiosks'),
          orderBy('name', 'asc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          ...doc.data(),
          documentId: doc.id
        })) as Kiosk[];
      } catch (orderError) {
        console.log('No orderBy index, using simple query...');
        const q = query(collection(db, 'kiosks'));
        const querySnapshot = await getDocs(q);
        const kiosks = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          documentId: doc.id
        })) as Kiosk[];
        
        // Sort in memory
        return kiosks.sort((a, b) => a.name.localeCompare(b.name));
      }
    } catch (error) {
      console.error('Error getting all kiosks:', error);
      throw error;
    }
  }

  /**
   * Get active kiosks only
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
   * Get kiosk by custom ID
   */
  static async getKioskById(kioskId: string): Promise<Kiosk | null> {
    try {
      console.log('Searching for kiosk with ID:', kioskId);
      
      const q = query(
        collection(db, 'kiosks'),
        where('id', '==', kioskId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('No kiosk found with ID:', kioskId);
        return null;
      }
      
      const docSnap = querySnapshot.docs[0];
      const kiosk = {
        ...docSnap.data(),
        documentId: docSnap.id
      } as Kiosk;
      
      console.log('Kiosk found:', kiosk.name, 'at', kiosk.city);
      return kiosk;
    } catch (error) {
      console.error('Error getting kiosk by ID:', error);
      return null;
    }
  }

  /**
   * Save kiosk with validation
   */
  static async saveKiosk(kioskData: Omit<Kiosk, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('Saving kiosk:', kioskData);

      // Validate required fields
      this.validateKioskData(kioskData);

      const existingKiosk = await this.getKioskById(kioskData.id);
      
      if (existingKiosk?.documentId) {
        // Update existing
        console.log('Updating existing kiosk:', kioskData.id);
        const kioskRef = doc(db, 'kiosks', existingKiosk.documentId);
        await updateDoc(kioskRef, {
          ...kioskData,
          updatedAt: serverTimestamp()
        });
        return existingKiosk.documentId;
      } else {
        // Create new
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
      throw new Error(`Error saving kiosk: ${error.message}`);
    }
  }

  /**
   * Validate kiosk data
   */
  private static validateKioskData(kioskData: Omit<Kiosk, 'createdAt' | 'updatedAt'>): void {
    if (!kioskData.id || !kioskData.name || !kioskData.city || !kioskData.state) {
      throw new Error('Missing required fields: id, name, city, state');
    }

    if (!kioskData.coordinates || 
        typeof kioskData.coordinates.latitude !== 'number' || 
        typeof kioskData.coordinates.longitude !== 'number') {
      throw new Error('Invalid coordinates');
    }

    if (Math.abs(kioskData.coordinates.latitude) > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }

    if (Math.abs(kioskData.coordinates.longitude) > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
  }

  /**
   * Batch import kiosks with transaction safety
   */
  static async batchImportKiosks(kiosks: Omit<Kiosk, 'createdAt' | 'updatedAt'>[]): Promise<{
    success: number;
    errors: Array<{ kiosk: any; error: string }>;
  }> {
    try {
      console.log(`Starting batch import of ${kiosks.length} kiosks...`);
      
      const batch = writeBatch(db);
      const timestamp = serverTimestamp();
      let successCount = 0;
      const errors: Array<{ kiosk: any; error: string }> = [];

      for (const kioskData of kiosks) {
        try {
          // Validate each kiosk
          this.validateKioskData(kioskData);

          // Check if exists
          const existing = await this.getKioskById(kioskData.id);
          
          if (existing?.documentId) {
            // Update existing
            const kioskRef = doc(db, 'kiosks', existing.documentId);
            batch.update(kioskRef, {
              ...kioskData,
              updatedAt: timestamp
            });
          } else {
            // Create new
            const docRef = doc(collection(db, 'kiosks'));
            batch.set(docRef, {
              ...kioskData,
              createdAt: timestamp,
              updatedAt: timestamp
            });
          }
          successCount++;
        } catch (error) {
          console.warn('Skipping invalid kiosk:', kioskData, error);
          errors.push({ kiosk: kioskData, error: error.message });
        }
      }

      await batch.commit();
      console.log(`Batch import completed: ${successCount} successful, ${errors.length} errors`);
      
      return { success: successCount, errors };
    } catch (error) {
      console.error('Error in batch import:', error);
      throw new Error(`Error importing kiosks: ${error.message}`);
    }
  }

  // ================== SYSTEM CONFIG ==================

  /**
   * Get system configuration with fallback defaults
   */
  static async getSystemConfig(productType?: string): Promise<SystemConfig> {
    try {
      const configId = productType || 'global';
      console.log(`Getting configuration for: ${configId}`);
      
      const configRef = doc(db, 'system_config', configId);
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists()) {
        const data = configDoc.data();
        console.log(`Configuration found for ${configId}`);
        
        return {
          id: configDoc.id,
          ...data
        } as SystemConfig;
      }

      console.log(`No configuration for ${configId}, creating defaults`);
      
      // Create default configuration
      const defaultConfig = this.getDefaultSystemConfig();
      await setDoc(configRef, defaultConfig);
      console.log(`Default configuration created for ${configId}`);
      
      return { id: configId, ...defaultConfig } as SystemConfig;
    } catch (error) {
      console.error('Error getting system config:', error);
      
      // Return minimal config to keep app functional
      return {
        id: productType || 'global',
        ...this.getDefaultSystemConfig()
      } as SystemConfig;
    }
  }

  /**
   * Get default system configuration
   */
  private static getDefaultSystemConfig(): Omit<SystemConfig, 'id'> {
    return {
      toleranceMinutes: 5,
      severeDelayThreshold: 20,
      defaultRadius: 150,
      restDay: 'sunday',
      absenceRules: {
        noEntryAfterMinutes: 60,
        noExitAfterMinutes: 120,
      },
      autoCloseRules: {
        closeAfterMinutes: 60,
        markAsAbsent: true,
      },
      lunchRules: {
        maxDurationMinutes: 60, // Máximo 1 hora de comida
      },
      notificationRules: {
        notifyOnAbsence: true,
        notifyOnLateExit: false,
        notifyOnLateArrival: true,      // NUEVO
        notifyOnLongLunch: true,         // NUEVO
        notifySupervisor: true,          // NUEVO
        notifyAdmin: true,               // NUEVO
        notifyUser: true,                // NUEVO
      },
      alertRules: {
        generateOnIrregularities: true,
      },
      approvalRules: {
        requireForLateExit: false,
      },
      commentRules: {                    // NUEVO
        requireOnLateArrival: true,
        requireOnEarlyDeparture: true,
        requireOnLongLunch: true,
        minCommentLength: 10,
      },
      slackConfig: {                     // NUEVO
        enabled: false,
        notifyOnLateArrival: true,
        notifyOnAbsence: true,
        notifyOnLongLunch: true,
      },
      updatedAt: serverTimestamp(),
      updatedBy: 'system'
    };
  }

  /**
   * Update system configuration with validation
   */
  static async updateSystemConfig(
    configData: Partial<SystemConfig>, 
    productType?: string,
    updatedBy?: string
  ): Promise<void> {
    try {
      const configId = productType || 'global';
      console.log(`Updating configuration for ${configId}:`, configData);
      
      // Validate configuration before saving
      const validation = await this.validateSystemConfig(configData);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        console.warn('Configuration warnings:', validation.warnings);
      }

      // Prepare data for saving
      const dataToSave = {
        ...configData,
        updatedAt: serverTimestamp(),
        updatedBy: updatedBy || 'system'
      };

      // Remove undefined fields
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key as keyof typeof dataToSave] === undefined) {
          delete dataToSave[key as keyof typeof dataToSave];
        }
      });

      const configRef = doc(db, 'system_config', configId);
      await setDoc(configRef, dataToSave, { merge: true });

      console.log(`Configuration saved successfully for: ${configId}`);
    } catch (error) {
      console.error('Error updating system config:', error);
      throw new Error(`Error saving configuration: ${(error as Error).message}`);
    }
  }

  /**
   * Validate system configuration
   */
  static async validateSystemConfig(config: Partial<SystemConfig>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic validations
      if (config.toleranceMinutes !== undefined) {
        if (config.toleranceMinutes < 0 || config.toleranceMinutes > 60) {
          errors.push('Tolerance must be between 0 and 60 minutes');
        }
      }

      if (config.severeDelayThreshold !== undefined) {
        if (config.severeDelayThreshold < 5 || config.severeDelayThreshold > 120) {
          errors.push('Severe delay threshold must be between 5 and 120 minutes');
        }
      }

      if (config.defaultRadius !== undefined) {
        if (config.defaultRadius < 50 || config.defaultRadius > 1000) {
          errors.push('Default radius must be between 50 and 1000 meters');
        }
      }

      // Validate absence rules
      if (config.absenceRules) {
        if (config.absenceRules.noEntryAfterMinutes !== undefined) {
          if (config.absenceRules.noEntryAfterMinutes < 0 || config.absenceRules.noEntryAfterMinutes > 480) {
            errors.push('Entry absence time must be between 0 and 480 minutes');
          }
        }

        if (config.absenceRules.noExitAfterMinutes !== undefined) {
          if (config.absenceRules.noExitAfterMinutes < 0 || config.absenceRules.noExitAfterMinutes > 480) {
            errors.push('Exit absence time must be between 0 and 480 minutes');
          }
        }
      }

      // Validate auto close rules
      if (config.autoCloseRules?.closeAfterMinutes !== undefined) {
        if (config.autoCloseRules.closeAfterMinutes < 0 || config.autoCloseRules.closeAfterMinutes > 240) {
          errors.push('Auto close time must be between 0 and 240 minutes');
        }
      }

      // Validate lunch rules
      if (config.lunchRules?.maxDurationMinutes !== undefined) {
        if (config.lunchRules.maxDurationMinutes < 30 || config.lunchRules.maxDurationMinutes > 180) {
          errors.push('Max lunch duration must be between 30 and 180 minutes');
        }
      }

      // Warnings for potentially problematic values
      if (config.absenceRules?.noEntryAfterMinutes && config.absenceRules.noEntryAfterMinutes > 120) {
        warnings.push('Entry grace period is very high (>2 hours)');
      }

      if (config.lunchRules?.maxDurationMinutes && config.lunchRules.maxDurationMinutes > 120) {
        warnings.push('Max lunch time is very high (>2 hours)');
      }

      // Cross-validation
      if (config.autoCloseRules?.closeAfterMinutes && 
          config.absenceRules?.noExitAfterMinutes &&
          config.autoCloseRules.closeAfterMinutes < config.absenceRules.noExitAfterMinutes) {
        warnings.push('Auto close happens before exit absence detection');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Error validating config:', error);
      return {
        isValid: false,
        errors: ['Error validating configuration'],
        warnings: []
      };
    }
  }

  /**
   * Reset configuration to defaults
   */
  static async resetSystemConfigToDefaults(productType?: string): Promise<void> {
    const defaultConfig = this.getDefaultSystemConfig();
    await this.updateSystemConfig(defaultConfig, productType, 'system_reset');
  }

  /**
   * Get attendance rules specifically
   */
  static async getAttendanceRules(productType?: string): Promise<SystemConfig['absenceRules']> {
    try {
      const config = await this.getSystemConfig(productType);
      return config.absenceRules || {
        noEntryAfterMinutes: 60,
        noExitAfterMinutes: 120
      };
    } catch (error) {
      console.error('Error getting attendance rules:', error);
      return {
        noEntryAfterMinutes: 60,
        noExitAfterMinutes: 120
      };
    }
  }

  /**
   * Update only attendance rules
   */
  static async updateAttendanceRules(
    rules: SystemConfig['absenceRules'], 
    productType?: string,
    updatedBy?: string
  ): Promise<void> {
    try {
      await this.updateSystemConfig(
        { absenceRules: rules },
        productType,
        updatedBy
      );
    } catch (error) {
      console.error('Error updating attendance rules:', error);
      throw error;
    }
  }

  // ================== HOLIDAYS ==================

  /**
   * Get holidays for specific year
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

  /**
   * Add new holiday
   */
  static async addHoliday(holidayData: Omit<Holiday, 'id' | 'createdAt'>): Promise<string> {
    try {
      const data = {
        ...holidayData,
        date: Timestamp.fromDate(holidayData.date as any), // Convert Date to Timestamp
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'holidays'), data);
      return docRef.id;
    } catch (error) {
      console.error('Error adding holiday:', error);
      throw error;
    }
  }

  /**
   * Delete holiday
   */
  static async deleteHoliday(holidayId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'holidays', holidayId));
    } catch (error) {
      console.error('Error deleting holiday:', error);
      throw error;
    }
  }

  // ================== GENERIC OPERATIONS ==================

  /**
   * Get single document with type safety
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
   * Listen to document changes with cleanup
   */
  static listenToDocument<T>(
    collectionName: string, 
    docId: string, 
    callback: (data: T | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(
      docRef, 
      (doc) => {
        if (doc.exists()) {
          callback({ id: doc.id, ...doc.data() } as T);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error(`Error listening to ${collectionName}/${docId}:`, error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * Listen to collection changes
   */
  static listenToCollection<T>(
    collectionName: string,
    constraints: QueryConstraint[],
    callback: (data: T[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const q = query(collection(db, collectionName), ...constraints);
    return onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
        callback(data);
      },
      (error) => {
        console.error(`Error listening to ${collectionName}:`, error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * Batch operation helper
   */
  static async executeBatch(operations: Array<{
    type: 'create' | 'update' | 'delete';
    collection: string;
    id?: string;
    data?: any;
  }>): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      operations.forEach(operation => {
        switch (operation.type) {
          case 'create':
            const createRef = doc(collection(db, operation.collection));
            batch.set(createRef, operation.data);
            break;
            
          case 'update':
            if (!operation.id) throw new Error('ID required for update operation');
            const updateRef = doc(db, operation.collection, operation.id);
            batch.update(updateRef, operation.data);
            break;
            
          case 'delete':
            if (!operation.id) throw new Error('ID required for delete operation');
            const deleteRef = doc(db, operation.collection, operation.id);
            batch.delete(deleteRef);
            break;
        }
      });

      await batch.commit();
    } catch (error) {
      console.error('Error executing batch operations:', error);
      throw error;
    }
  }

  // ================== PRIVATE HELPERS ==================

  /**
   * ✅ CORREGIDO: Validate check-in location and timing
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

    const config = await this.getSystemConfig(kiosk.productType);
    const allowedRadius = kiosk.radiusOverride || config.defaultRadius || 150;
    const locationValid = distance <= allowedRadius;

    // ✅ OBTENER ÚLTIMO CHECK-IN DE COMIDA SOLO SI ES REGRESO DE COMIDA
    let lastLunchCheckIn: Date | undefined;
    if (checkInType === 'regreso_comida') {
      console.log('🍽️ Validating lunch return - getting last lunch check-in...');
      
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
        console.log(`🍽️ Found lunch check-in at: ${lastLunchCheckIn.toLocaleTimeString()}`);
      } else {
        console.warn('⚠️ No lunch check-in found for regreso_comida validation');
        // Esto podría ser un error - el usuario no registró comida
      }
    }

    // ✅ VALIDAR TIMING CON LÓGICA CORREGIDA
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
      status: timingValidation.status,
      // ✅ INFORMACIÓN ADICIONAL PARA DEBUG
      ...(checkInType === 'regreso_comida' && {
        lunchCheckInFound: !!lastLunchCheckIn,
        lunchStartTime: lastLunchCheckIn?.toISOString()
      })
    };
  }

  /**
   * ✅ CORREGIDO: Determine check-in status con lógica específica
   */
  private static determineCheckInStatus(validationResults: any): 'a_tiempo' | 'retrasado' | 'anticipado' | 'ubicacion_invalida' {
    // Primero verificar ubicación
    if (!validationResults.locationValid) {
      return 'ubicacion_invalida';
    }
    
    // Usar el status calculado por el servicio de schedules
    if (validationResults.status) {
      return validationResults.status;
    }
    
    // Fallback (no debería llegar aquí)
    if (validationResults.minutesLate > 0) {
      return 'retrasado';
    }
    
    if (validationResults.minutesEarly > 30) {
      return 'anticipado';
    }
    
    return 'a_tiempo';
  }

  /**
   * Calculate distance between coordinates using Haversine formula
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

  /**
   * Format error message for user display
   */
  private static formatErrorMessage(error: any, operation: string): string {
    if (error.code === 'permission-denied') {
      return `Permission denied for ${operation}. Check your access rights.`;
    }
    
    if (error.code === 'not-found') {
      return `Requested resource not found for ${operation}.`;
    }
    
    if (error.code === 'unavailable') {
      return `Service temporarily unavailable. Please try again.`;
    }

    return `Error in ${operation}: ${error.message}`;
  }

  /**
   * Retry operation with exponential backoff
   */
  private static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Check if we're in offline mode
   */
  static isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Get cache key for offline operations
   */
  private static getCacheKey(operation: string, params: any = {}): string {
    return `firestore_${operation}_${JSON.stringify(params)}`;
  }

  /**
   * Cache result for offline use (commented out due to artifact limitations)
   */
  // private static cacheResult(key: string, data: any, ttl = 300000): void { // 5 minutes TTL
  //   try {
  //     const cacheItem = {
  //       data,
  //       timestamp: Date.now(),
  //       ttl
  //     };
  //     localStorage.setItem(key, JSON.stringify(cacheItem));
  //   } catch (error) {
  //     console.warn('Failed to cache result:', error);
  //   }
  // }

  /**
   * Get cached result if available and valid (commented out due to artifact limitations)
   */
  // private static getCachedResult(key: string): any | null {
  //   try {
  //     const cached = localStorage.getItem(key);
  //     if (!cached) return null;

  //     const cacheItem = JSON.parse(cached);
  //     const isExpired = Date.now() - cacheItem.timestamp > cacheItem.ttl;
      
  //     if (isExpired) {
  //       localStorage.removeItem(key);
  //       return null;
  //     }

  //     return cacheItem.data;
  //   } catch (error) {
  //     console.warn('Failed to get cached result:', error);
  //     return null;
  //   }
  // }
}