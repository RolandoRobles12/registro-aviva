import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../config/firebase'
import { auth } from '../config/firebase' // Asegúrate de exportarlo ahí

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
      // Validar sesión y uid
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('No autenticado')
      if (currentUser.uid !== userId) {
        // Evita paths de otros usuarios (tus reglas lo exigen)
        throw new Error('UID de ruta no coincide con el usuario autenticado')
      }

      // Comprimir antes de subir
      const compressedFile = await this.compressImage(file)

      // Validar tamaño (tus reglas: < 10MB)
      if (compressedFile.size >= 10 * 1024 * 1024) {
        throw new Error('La foto supera 10MB')
      }

      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')

      const fileName = `${checkInId}_${Date.now()}.jpg`
      const filePath = `attendance-photos/${year}/${month}/${userId}/${fileName}`

      const storageRef = ref(storage, filePath)

      // 🔑 METADATA con contentType = image/*
      const metadata = { contentType: compressedFile.type || 'image/jpeg' }

      const snapshot = await uploadBytes(storageRef, compressedFile, metadata)
      const downloadURL = await getDownloadURL(snapshot.ref)
      return downloadURL
    } catch (error) {
      console.error('Error uploading photo:', error)
      throw new Error('Error subiendo la fotografía')
    }
  }

  /**
   * Delete photo from storage
   */
  static async deletePhoto(photoUrl: string): Promise<void> {
    try {
      // ref(storage, url) funciona con gs:// y https://
      const photoRef = ref(storage, photoUrl)
      await deleteObject(photoRef)
    } catch (error) {
      console.error('Error deleting photo:', error)
      // no propagar
    }
  }

  /**
   * Compress image before upload
   */
  private static async compressImage(file: File, quality = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()

      img.onload = () => {
        // Redimensionar (máx 1920x1080)
        const maxWidth = 1920
        const maxHeight = 1080
        let { width, height } = img

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }
}
