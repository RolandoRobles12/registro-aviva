// src/services/hubs.ts - Servicio de gestión de Hubs
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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Hub, ProductType } from '../types';

export class HubService {
  private static readonly COLLECTION = 'hubs';

  /**
   * Crear un nuevo Hub
   */
  static async createHub(
    hubData: Omit<Hub, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<string> {
    try {
      // Validar que no exista un hub con el mismo nombre
      const existingHub = await this.getHubByName(hubData.name);
      if (existingHub) {
        throw new Error('Ya existe un Hub con ese nombre');
      }

      const docRef = await addDoc(collection(db, this.COLLECTION), {
        ...hubData,
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Hub creado exitosamente:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating hub:', error);
      throw error;
    }
  }

  /**
   * Obtener hub por ID
   */
  static async getHubById(hubId: string): Promise<Hub | null> {
    try {
      const docRef = doc(db, this.COLLECTION, hubId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Hub;
      }

      return null;
    } catch (error) {
      console.error('Error getting hub by ID:', error);
      return null;
    }
  }

  /**
   * Obtener hub por nombre
   */
  static async getHubByName(name: string): Promise<Hub | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('name', '==', name)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Hub;
      }

      return null;
    } catch (error) {
      console.error('Error getting hub by name:', error);
      return null;
    }
  }

  /**
   * Obtener todos los Hubs
   */
  static async getAllHubs(activeOnly: boolean = false): Promise<Hub[]> {
    try {
      let hubs: Hub[];

      if (activeOnly) {
        // Intentar query con índice primero
        try {
          const q = query(
            collection(db, this.COLLECTION),
            where('status', '==', 'active'),
            orderBy('name', 'asc')
          );
          const querySnapshot = await getDocs(q);
          hubs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Hub));
        } catch (indexError: any) {
          // Si falla por índice, usar fallback sin orderBy
          if (indexError?.message?.includes('index')) {
            console.warn('⚠️ Index not available, using fallback query for hubs');
            const q = query(
              collection(db, this.COLLECTION),
              where('status', '==', 'active')
            );
            const querySnapshot = await getDocs(q);
            hubs = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as Hub));
            // Ordenar en memoria
            hubs.sort((a, b) => a.name.localeCompare(b.name));
          } else {
            throw indexError;
          }
        }
      } else {
        // Sin filtro, solo ordenar
        try {
          const q = query(
            collection(db, this.COLLECTION),
            orderBy('name', 'asc')
          );
          const querySnapshot = await getDocs(q);
          hubs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Hub));
        } catch (indexError: any) {
          // Fallback simple
          if (indexError?.message?.includes('index')) {
            console.warn('⚠️ Index not available, using simple query for hubs');
            const querySnapshot = await getDocs(collection(db, this.COLLECTION));
            hubs = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as Hub));
            hubs.sort((a, b) => a.name.localeCompare(b.name));
          } else {
            throw indexError;
          }
        }
      }

      console.log(`✅ Loaded ${hubs.length} hubs (activeOnly: ${activeOnly})`);
      return hubs;
    } catch (error) {
      console.error('❌ Error getting hubs:', error);
      return [];
    }
  }

  /**
   * Obtener Hubs por estado geográfico
   */
  static async getHubsByState(state: string): Promise<Hub[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('states', 'array-contains', state),
        where('status', '==', 'active')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Hub));
    } catch (error) {
      console.error('Error getting hubs by state:', error);
      return [];
    }
  }

  /**
   * Obtener Hubs por tipo de producto
   */
  static async getHubsByProductType(productType: ProductType): Promise<Hub[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('productTypes', 'array-contains', productType),
        where('status', '==', 'active')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Hub));
    } catch (error) {
      console.error('Error getting hubs by product type:', error);
      return [];
    }
  }

  /**
   * Actualizar un Hub
   */
  static async updateHub(
    hubId: string,
    hubData: Partial<Omit<Hub, 'id' | 'createdAt' | 'createdBy'>>,
    updatedBy: string
  ): Promise<void> {
    try {
      // Validar que el hub exista
      const existingHub = await this.getHubById(hubId);
      if (!existingHub) {
        throw new Error('El Hub no existe');
      }

      // Si se está cambiando el nombre, validar que no exista otro con ese nombre
      if (hubData.name && hubData.name !== existingHub.name) {
        const hubWithSameName = await this.getHubByName(hubData.name);
        if (hubWithSameName && hubWithSameName.id !== hubId) {
          throw new Error('Ya existe un Hub con ese nombre');
        }
      }

      const docRef = doc(db, this.COLLECTION, hubId);
      await updateDoc(docRef, {
        ...hubData,
        updatedBy,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Hub actualizado exitosamente:', hubId);
    } catch (error) {
      console.error('Error updating hub:', error);
      throw error;
    }
  }

  /**
   * Eliminar un Hub
   */
  static async deleteHub(hubId: string): Promise<void> {
    try {
      // Verificar que no haya kioscos o usuarios asociados
      const hasAssociations = await this.checkHubAssociations(hubId);
      if (hasAssociations) {
        throw new Error('No se puede eliminar el Hub porque tiene kioscos o usuarios asociados');
      }

      const docRef = doc(db, this.COLLECTION, hubId);
      await deleteDoc(docRef);

      console.log('✅ Hub eliminado exitosamente:', hubId);
    } catch (error) {
      console.error('Error deleting hub:', error);
      throw error;
    }
  }

  /**
   * Activar/Desactivar un Hub
   */
  static async toggleHubStatus(
    hubId: string,
    updatedBy: string
  ): Promise<void> {
    try {
      const hub = await this.getHubById(hubId);
      if (!hub) {
        throw new Error('El Hub no existe');
      }

      const newStatus = hub.status === 'active' ? 'inactive' : 'active';

      const docRef = doc(db, this.COLLECTION, hubId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedBy,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Hub ${newStatus === 'active' ? 'activado' : 'desactivado'}:`, hubId);
    } catch (error) {
      console.error('Error toggling hub status:', error);
      throw error;
    }
  }

  /**
   * Verificar si un Hub tiene kioscos o usuarios asociados
   */
  static async checkHubAssociations(hubId: string): Promise<boolean> {
    try {
      // Verificar kioscos
      const kiosksQuery = query(
        collection(db, 'kiosks'),
        where('hubId', '==', hubId)
      );
      const kiosksSnapshot = await getDocs(kiosksQuery);

      if (!kiosksSnapshot.empty) {
        return true;
      }

      // Verificar usuarios
      const usersQuery = query(
        collection(db, 'users'),
        where('hubId', '==', hubId)
      );
      const usersSnapshot = await getDocs(usersQuery);

      if (!usersSnapshot.empty) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking hub associations:', error);
      return false;
    }
  }

  /**
   * Obtener estadísticas de un Hub
   */
  static async getHubStats(hubId: string): Promise<{
    totalKiosks: number;
    activeKiosks: number;
    totalUsers: number;
    activeUsers: number;
    statesCount: number;
    productsCount: number;
  }> {
    try {
      const hub = await this.getHubById(hubId);
      if (!hub) {
        throw new Error('El Hub no existe');
      }

      // Contar kioscos
      const kiosksQuery = query(
        collection(db, 'kiosks'),
        where('hubId', '==', hubId)
      );
      const kiosksSnapshot = await getDocs(kiosksQuery);
      const totalKiosks = kiosksSnapshot.size;
      const activeKiosks = kiosksSnapshot.docs.filter(
        doc => doc.data().status === 'active'
      ).length;

      // Contar usuarios
      const usersQuery = query(
        collection(db, 'users'),
        where('hubId', '==', hubId)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const totalUsers = usersSnapshot.size;
      const activeUsers = usersSnapshot.docs.filter(
        doc => doc.data().status === 'active'
      ).length;

      return {
        totalKiosks,
        activeKiosks,
        totalUsers,
        activeUsers,
        statesCount: hub.states.length,
        productsCount: hub.productTypes.length
      };
    } catch (error) {
      console.error('Error getting hub stats:', error);
      return {
        totalKiosks: 0,
        activeKiosks: 0,
        totalUsers: 0,
        activeUsers: 0,
        statesCount: 0,
        productsCount: 0
      };
    }
  }

  /**
   * Obtener lista de estados únicos de todos los kioscos
   */
  static async getAvailableStates(): Promise<string[]> {
    try {
      const kiosksQuery = query(collection(db, 'kiosks'));
      const kiosksSnapshot = await getDocs(kiosksQuery);

      const states = new Set<string>();
      kiosksSnapshot.docs.forEach(doc => {
        const state = doc.data().state;
        if (state) {
          states.add(state);
        }
      });

      return Array.from(states).sort();
    } catch (error) {
      console.error('Error getting available states:', error);
      return [];
    }
  }

  /**
   * Asignar kioscos a un Hub automáticamente según estado y producto
   */
  static async autoAssignKiosksToHub(hubId: string): Promise<number> {
    try {
      const hub = await this.getHubById(hubId);
      if (!hub) {
        throw new Error('El Hub no existe');
      }

      let assignedCount = 0;

      // Buscar kioscos que coincidan con los estados y productos del hub
      const kiosksQuery = query(
        collection(db, 'kiosks'),
        where('status', '==', 'active')
      );
      const kiosksSnapshot = await getDocs(kiosksQuery);

      for (const kioskDoc of kiosksSnapshot.docs) {
        const kiosk = kioskDoc.data();

        // Verificar si el kiosko coincide con el hub
        const stateMatch = hub.states.includes(kiosk.state);
        const productMatch = hub.productTypes.includes(kiosk.productType);

        if (stateMatch && productMatch && !kiosk.hubId) {
          // Asignar el kiosko al hub
          await updateDoc(doc(db, 'kiosks', kioskDoc.id), {
            hubId: hubId,
            updatedAt: serverTimestamp()
          });
          assignedCount++;
        }
      }

      console.log(`✅ ${assignedCount} kioscos asignados automáticamente al hub ${hubId}`);
      return assignedCount;
    } catch (error) {
      console.error('Error auto-assigning kiosks to hub:', error);
      return 0;
    }
  }
}
