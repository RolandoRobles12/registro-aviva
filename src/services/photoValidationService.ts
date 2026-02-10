import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * Interfaz para llamar a Cloud Function de revisión manual de fotos
 */
interface ManualPhotoReviewParams {
  checkInId: string;
  approved: boolean;
  notes?: string;
}

interface ManualPhotoReviewResponse {
  success: boolean;
  message: string;
}

interface AIValidationParams {
  checkInId: string;
}

interface AIValidationResponse {
  success: boolean;
  validation: {
    status: string;
    confidence: number;
    rejectionReason?: string;
  };
}

/**
 * Servicio para interactuar con las Cloud Functions de validación de fotos
 */
export class PhotoValidationService {
  /**
   * Permite a un supervisor aprobar o rechazar manualmente una foto de check-in
   * @param checkInId - ID del check-in
   * @param approved - true para aprobar, false para rechazar
   * @param notes - Notas opcionales del supervisor
   */
  static async reviewPhoto(
    checkInId: string,
    approved: boolean,
    notes?: string
  ): Promise<ManualPhotoReviewResponse> {
    try {
      // Llamar a Cloud Function
      const manualPhotoReview = httpsCallable<ManualPhotoReviewParams, ManualPhotoReviewResponse>(
        functions,
        'manualPhotoReview'
      );

      const result = await manualPhotoReview({
        checkInId,
        approved,
        notes,
      });

      return result.data;
    } catch (error: any) {
      console.error('Error en revisión manual de foto:', error);

      // Extraer mensaje de error de Firebase Functions
      const errorMessage = error.message || 'Error al procesar la revisión de la foto';

      throw new Error(errorMessage);
    }
  }

  /**
   * Aprobar una foto
   */
  static async approvePhoto(checkInId: string, notes?: string): Promise<ManualPhotoReviewResponse> {
    return this.reviewPhoto(checkInId, true, notes);
  }

  /**
   * Rechazar una foto
   */
  static async rejectPhoto(checkInId: string, reason: string): Promise<ManualPhotoReviewResponse> {
    return this.reviewPhoto(checkInId, false, reason);
  }

  /**
   * Disparar validación de foto con IA manualmente
   */
  static async triggerAIValidation(checkInId: string): Promise<AIValidationResponse> {
    try {
      const validatePhotoWithAI = httpsCallable<AIValidationParams, AIValidationResponse>(
        functions,
        'validatePhotoWithAI'
      );

      const result = await validatePhotoWithAI({ checkInId });
      return result.data;
    } catch (error: any) {
      console.error('Error en validación con IA:', error);
      throw new Error(error.message || 'Error al validar la foto con IA');
    }
  }
}
