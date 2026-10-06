// src/services/deletedUsers.ts
// Lista de bloqueo de usuarios eliminados desde la plataforma.
// Al eliminar un usuario se guarda un registro en `deleted_users/{uid}`; mientras exista,
// el login lo rechaza aunque su cuenta de Google siga siendo válida. Un admin debe
// restaurar el acceso manualmente para que pueda volver a entrar.
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DeletedUser, User } from '../types';

const COLLECTION = 'deleted_users';

export class DeletedUsersService {
  static async isDeleted(uid: string): Promise<boolean> {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    return snap.exists();
  }

  /**
   * Elimina los documentos de usuario y registra el bloqueo en la misma operación atómica.
   */
  static async deleteUsers(users: User[], deletedBy: { id: string; email: string }): Promise<void> {
    // Firestore permite máximo 500 operaciones por batch (2 por usuario)
    const CHUNK = 200;
    for (let i = 0; i < users.length; i += CHUNK) {
      const batch = writeBatch(db);
      users.slice(i, i + CHUNK).forEach((u) => {
        batch.set(doc(db, COLLECTION, u.id), {
          email: u.email.toLowerCase(),
          name: u.name,
          deletedAt: serverTimestamp(),
          deletedBy: deletedBy.id,
          deletedByEmail: deletedBy.email,
        });
        batch.delete(doc(db, 'users', u.id));
      });
      await batch.commit();
    }
  }

  static async list(): Promise<DeletedUser[]> {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as DeletedUser)
      .sort((a, b) => (b.deletedAt?.toMillis?.() ?? 0) - (a.deletedAt?.toMillis?.() ?? 0));
  }

  /**
   * Quita el bloqueo. El usuario podrá iniciar sesión de nuevo y se le creará
   * un perfil nuevo (rol promotor) en su siguiente acceso.
   */
  static async restore(uid: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, uid));
  }
}
