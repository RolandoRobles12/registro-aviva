// Service for user migration utilities
import { collection, getDocs, query, where, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, CheckIn, ProductType } from '../types';

interface MigrationResult {
  userId: string;
  userName: string;
  productType?: ProductType;
  error?: string;
}

interface MigrationSummary {
  total: number;
  success: number;
  noCheckIns: number;
  errors: number;
  results: MigrationResult[];
}

/**
 * Asigna productType a usuarios activos basándose en su último check-in
 */
export async function assignProductTypesFromCheckIns(
  onProgress?: (current: number, total: number, userName: string) => void
): Promise<MigrationSummary> {
  const results: MigrationResult[] = [];
  let successCount = 0;
  let noCheckInsCount = 0;
  let errorCount = 0;

  try {
    // 1. Obtener todos los usuarios activos sin productType
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));

    // Filtrar usuarios que necesitan asignación
    const usersNeedingProduct = users.filter(user =>
      user.status === 'active' &&
      !user.productType &&
      user.role !== 'super_admin' &&
      user.role !== 'admin'
    );

    const total = usersNeedingProduct.length;

    if (total === 0) {
      return {
        total: 0,
        success: 0,
        noCheckIns: 0,
        errors: 0,
        results: []
      };
    }

    // 2. Para cada usuario, buscar su último check-in
    for (let i = 0; i < usersNeedingProduct.length; i++) {
      const user = usersNeedingProduct[i];

      // Notificar progreso
      if (onProgress) {
        onProgress(i + 1, total, user.name);
      }

      try {
        // Buscar todos los check-ins del usuario
        const checkInsRef = collection(db, 'checkins');
        const q = query(
          checkInsRef,
          where('userId', '==', user.id)
        );

        const checkInsSnapshot = await getDocs(q);

        if (checkInsSnapshot.empty) {
          noCheckInsCount++;
          results.push({
            userId: user.id,
            userName: user.name,
            error: 'Sin check-ins registrados'
          });
          continue;
        }

        // Ordenar en memoria por timestamp y obtener el más reciente
        const checkIns = checkInsSnapshot.docs.map(doc => doc.data() as CheckIn);
        const lastCheckIn = checkIns.sort((a, b) => {
          const timeA = a.timestamp?.toMillis() || 0;
          const timeB = b.timestamp?.toMillis() || 0;
          return timeB - timeA; // Más reciente primero
        })[0];

        const productType = lastCheckIn?.productType;

        if (!productType) {
          errorCount++;
          results.push({
            userId: user.id,
            userName: user.name,
            error: 'Check-in sin productType'
          });
          continue;
        }

        // Actualizar el usuario con el productType
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          productType,
          updatedAt: new Date()
        });

        successCount++;
        results.push({
          userId: user.id,
          userName: user.name,
          productType
        });

      } catch (error) {
        errorCount++;
        results.push({
          userId: user.id,
          userName: user.name,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    return {
      total,
      success: successCount,
      noCheckIns: noCheckInsCount,
      errors: errorCount,
      results
    };

  } catch (error) {
    console.error('Error en assignProductTypesFromCheckIns:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de usuarios sin producto asignado
 */
export async function getUsersWithoutProduct(): Promise<{
  total: number;
  users: Array<{ id: string; name: string; email: string; role: string }>;
}> {
  try {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));

    const usersWithoutProduct = users.filter(user =>
      user.status === 'active' &&
      !user.productType &&
      user.role !== 'super_admin' &&
      user.role !== 'admin'
    );

    return {
      total: usersWithoutProduct.length,
      users: usersWithoutProduct.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role
      }))
    };
  } catch (error) {
    console.error('Error en getUsersWithoutProduct:', error);
    throw error;
  }
}
