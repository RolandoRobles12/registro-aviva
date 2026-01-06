import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { validateCheckInPhoto } from './photoValidation';

// Inicializar Firebase Admin
admin.initializeApp();

/**
 * Cloud Function: Valida foto de check-in con Google Vision API
 * Se ejecuta cuando se sube una foto a Firebase Storage
 */
export const validatePhotoOnUpload = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB'
  })
  .storage
  .bucket('registro-aviva.firebasestorage.app')
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name;

    // Solo procesar fotos de check-in
    if (!filePath || !filePath.startsWith('attendance-photos/')) {
      console.log('Archivo no es foto de check-in, ignorando:', filePath);
      return null;
    }

    try {
      console.log('Procesando validación de foto:', filePath);

      // Obtener URL pública temporal
      const bucket = admin.storage().bucket(object.bucket);
      const file = bucket.file(filePath);

      // Validar foto con Google Vision API
      const validationResult = await validateCheckInPhoto(file);

      // Extraer checkInId del path
      // attendance-photos/2025/12/userId/checkinId_timestamp.jpg
      const fileName = filePath.split('/').pop();
      const checkInId = fileName?.split('_')[0];

      if (!checkInId) {
        console.error('No se pudo extraer checkInId del path:', filePath);
        return null;
      }

      // Actualizar documento de check-in con resultados de validación
      await admin.firestore().collection('checkins').doc(checkInId).update({
        photoValidation: {
          ...validationResult,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });

      console.log('Validación de foto completada:', {
        checkInId,
        status: validationResult.status,
        confidence: validationResult.confidence,
      });

      // Si la foto fue rechazada automáticamente, crear notificación
      if (validationResult.status === 'rejected') {
        await admin.firestore().collection('notifications').add({
          type: 'photo_rejected',
          title: 'Foto de Check-in Rechazada',
          message: validationResult.rejectionReason || 'La foto no cumple con los requisitos',
          checkInId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        });
      }

      return null;
    } catch (error) {
      console.error('Error validando foto:', error);
      return null;
    }
  });

/**
 * Cloud Function: Permite validación manual de fotos por supervisores
 * Endpoint HTTP para que supervisores aprueben/rechacen fotos
 */
export const manualPhotoReview = functions.https.onCall(async (data, context) => {
  // Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Debe estar autenticado para realizar esta acción'
    );
  }

  // Verificar que sea supervisor o admin
  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  const userData = userDoc.data();

  if (!userData || !['supervisor', 'admin', 'super_admin'].includes(userData.role)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo supervisores y administradores pueden validar fotos'
    );
  }

  const { checkInId, approved, notes } = data;

  if (!checkInId || typeof approved !== 'boolean') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Parámetros inválidos'
    );
  }

  try {
    // Actualizar check-in con decisión manual
    await admin.firestore().collection('checkins').doc(checkInId).update({
      'photoValidation.status': approved ? 'approved' : 'rejected',
      'photoValidation.reviewedBy': context.auth.uid,
      'photoValidation.reviewedAt': admin.firestore.FieldValue.serverTimestamp(),
      'photoValidation.reviewNotes': notes || '',
      'photoValidation.rejectionReason': approved ? null : (notes || 'Rechazado por supervisor'),
    });

    // Crear notificación para el empleado
    const checkInDoc = await admin.firestore().collection('checkins').doc(checkInId).get();
    const checkInData = checkInDoc.data();

    if (checkInData) {
      await admin.firestore().collection('notifications').add({
        type: approved ? 'photo_approved' : 'photo_rejected',
        title: approved ? 'Foto Aprobada' : 'Foto Rechazada',
        message: approved
          ? 'Tu foto de check-in ha sido aprobada'
          : `Tu foto de check-in fue rechazada: ${notes || 'No cumple con los requisitos'}`,
        userId: checkInData.userId,
        checkInId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });
    }

    return {
      success: true,
      message: approved ? 'Foto aprobada exitosamente' : 'Foto rechazada',
    };
  } catch (error) {
    console.error('Error en revisión manual:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error al procesar la revisión'
    );
  }
});
