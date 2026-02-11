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

      // Extraer checkInId del path
      // attendance-photos/2025/12/userId/checkinId_timestamp.jpg
      const fileName = filePath.split('/').pop();
      const checkInId = fileName?.split('_')[0];

      if (!checkInId) {
        console.error('No se pudo extraer checkInId del path:', filePath);
        return null;
      }

      // Obtener el documento de check-in para verificar el tipo
      const checkInDoc = await admin.firestore().collection('checkins').doc(checkInId).get();

      if (!checkInDoc.exists) {
        console.error('Documento de check-in no encontrado:', checkInId);
        return null;
      }

      const checkInData = checkInDoc.data();

      // SOLO validar fotos de tipo "entrada"
      if (checkInData?.type !== 'entrada') {
        console.log('Check-in no es de tipo entrada, omitiendo validación:', {
          checkInId,
          type: checkInData?.type
        });
        return null;
      }

      console.log('Check-in es de tipo entrada, procediendo con validación');

      // Obtener archivo de Storage
      const bucket = admin.storage().bucket(object.bucket);
      const file = bucket.file(filePath);

      // Validar foto con Google Vision API
      const validationResult = await validateCheckInPhoto(file);

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
 * Cloud Function: Envía el reporte diario de asistencia de un hub por correo.
 * Usa Resend (resend.com) — API key que no caduca, sin contraseñas.
 *
 * Configuración (una sola vez):
 *   firebase functions:config:set resend.key="re_xxxxxxxxxxxx"
 *   firebase functions:config:set resend.from="Registro Aviva <noreply@avivacredito.com>"
 */
export const sendHubReport = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Debe estar autenticado para enviar reportes'
    );
  }

  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  const userData = userDoc.data();
  if (!userData || !['admin', 'super_admin'].includes(userData.role)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden enviar reportes'
    );
  }

  const { hubId, hubName, date, recipients, html, notes } = data as {
    hubId: string;
    hubName: string;
    date: string;
    recipients: string[];
    html: string;
    notes?: string;
  };

  if (!hubId || !date || !recipients?.length || !html) {
    throw new functions.https.HttpsError('invalid-argument', 'Parámetros incompletos');
  }

  const resendKey = (functions.config().resend as any)?.key as string | undefined;
  if (!resendKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Falta la API key de Resend. Ejecuta: firebase functions:config:set resend.key="re_..."'
    );
  }
  const fromAddress =
    (functions.config().resend as any)?.from ||
    'Registro Aviva <noreply@avivacredito.com>';

  const [year, month, day] = date.split('-');
  const dateFormatted = `${day}/${month}/${year}`;

  // Node 18 tiene fetch nativo — sin paquetes externos
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: recipients,
      subject: `Reporte Diario — ${hubName} — ${dateFormatted}`,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Resend error:', errorText);
    throw new functions.https.HttpsError('internal', `Error al enviar el correo: ${errorText}`);
  }

  await admin.firestore().collection('hub_report_logs').add({
    hubId,
    hubName,
    date,
    recipients,
    sentBy: context.auth.uid,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    hasNotes: !!notes,
  });

  return { success: true };
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
