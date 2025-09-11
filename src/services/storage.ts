import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

export class StorageService {
  /**
   * Upload check-in photo
   */
  static async uploadCheckInPhoto(
    userId: string,
    file: File,
    checkInId: string
  ): Promise<string> {
    try {
      // Compress image before upload
      const compressedFile = await this.compressImage(file);
      
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      
      const fileName = `${checkInId}_${Date.now()}.jpg`;
      const filePath = `attendance-photos/${year}/${month}/${userId}/${fileName}`;
      
      const storageRef = ref(storage, filePath);
      const snapshot = await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw new Error('Error subiendo la fotografía');
    }
  }

  /**
   * Delete photo from storage
   */
  static async deletePhoto(photoUrl: string): Promise<void> {
    try {
      const photoRef = ref(storage, photoUrl);
      await deleteObject(photoRef);
    } catch (error) {
      console.error('Error deleting photo:', error);
      // Don't throw error for delete operations
    }
  }

  /**
   * Compress image before upload
   */
  private static async compressImage(file: File, quality = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920x1080)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }
}