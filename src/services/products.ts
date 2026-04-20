import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Product } from '../types';
import { PRODUCT_TYPES } from '../utils/constants';

export class ProductService {
  private static readonly COLLECTION = 'products';

  static async getProducts(): Promise<Product[]> {
    const q = query(collection(db, this.COLLECTION), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
  }

  static async getActiveProducts(): Promise<Product[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('status', '==', 'active'),
      orderBy('name', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
  }

  static async saveProduct(id: string, name: string): Promise<void> {
    const ref = doc(db, this.COLLECTION, id);
    await setDoc(
      ref,
      { id, name, status: 'active', updatedAt: serverTimestamp() },
      { merge: true }
    );
    // Set createdAt only on first creation (merge won't overwrite existing)
    const snap = await getDocs(
      query(collection(db, this.COLLECTION), where('id', '==', id))
    );
    if (snap.empty) {
      await updateDoc(ref, { createdAt: serverTimestamp() });
    }
  }

  static async createProduct(id: string, name: string): Promise<void> {
    const trimmedId = id.trim().replace(/\s+/g, '_');
    const ref = doc(db, this.COLLECTION, trimmedId);
    await setDoc(ref, {
      id: trimmedId,
      name: name.trim(),
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  static async updateProduct(id: string, name: string): Promise<void> {
    await updateDoc(doc(db, this.COLLECTION, id), {
      name: name.trim(),
      updatedAt: serverTimestamp()
    });
  }

  static async setProductStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
    await updateDoc(doc(db, this.COLLECTION, id), {
      status,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Seed the products collection from the hardcoded PRODUCT_TYPES constant.
   * Safe to call multiple times — uses merge so existing docs are not overwritten.
   */
  static async seedDefaultProducts(): Promise<number> {
    const entries = Object.entries(PRODUCT_TYPES) as [string, string][];
    for (const [id, name] of entries) {
      const ref = doc(db, this.COLLECTION, id);
      await setDoc(
        ref,
        {
          id,
          name,
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }
    return entries.length;
  }
}
