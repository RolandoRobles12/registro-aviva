import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { validateCheckInPhoto } from './photoValidation';

// Inicializar Firebase Admin
admin.initializeApp();

/**
 * Cloud Function: Valida foto de check-in con IA de forma manual
 * Se ejecuta SOLO cuando un admin/supervisor lo solicita explícitamente
 */
export const validatePhotoWithAI = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB'
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Debe estar autenticado para realizar esta acción'
      );
    }

    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || !['supervisor', 'admin', 'super_admin'].includes(userData.role)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Solo supervisores y administradores pueden validar fotos con IA'
      );
    }

    const { checkInId } = data;

    if (!checkInId) {
      throw new functions.https.HttpsError('invalid-argument', 'Se requiere checkInId');
    }

    const checkInDoc = await admin.firestore().collection('checkins').doc(checkInId).get();

    if (!checkInDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Check-in no encontrado');
    }

    const checkInData = checkInDoc.data();

    if (!checkInData?.photoUrl) {
      throw new functions.https.HttpsError('failed-precondition', 'El check-in no tiene foto');
    }

    try {
      // Extraer el storage path desde la download URL
      const photoUrl: string = checkInData.photoUrl;
      const urlObj = new URL(photoUrl);
      const filePath = decodeURIComponent(urlObj.pathname.split('/o/')[1].split('?')[0]);

      const bucket = admin.storage().bucket();
      const file = bucket.file(filePath);

      // Validar foto con Google Vision API
      const validationResult = await validateCheckInPhoto(file);

      await admin.firestore().collection('checkins').doc(checkInId).update({
        photoValidation: {
          ...validationResult,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          triggeredBy: context.auth.uid,
        },
      });

      if (validationResult.status === 'rejected') {
        await admin.firestore().collection('notifications').add({
          type: 'photo_rejected',
          title: 'Foto de Check-in Rechazada',
          message: validationResult.rejectionReason || 'La foto no cumple con los requisitos',
          userId: checkInData.userId,
          checkInId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        });
      }

      return { success: true, validation: validationResult };
    } catch (error) {
      console.error('Error validando foto con IA:', error);
      throw new functions.https.HttpsError('internal', 'Error al validar la foto con IA');
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
