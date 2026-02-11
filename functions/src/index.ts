import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';
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

/**
 * Cloud Function: Sincroniza cuentas suspendidas de Google Workspace con Firestore.
 * Ejecuta diariamente a las 06:00 AM (hora México). Marca como 'inactive' en Firestore
 * a los usuarios cuya cuenta de Google Workspace haya sido suspendida por el admin.
 *
 * Setup requerido (una sola vez):
 *   1. Crear service account en Google Cloud con domain-wide delegation habilitada.
 *   2. En Google Workspace Admin Console: conceder delegación al service account con el scope:
 *      https://www.googleapis.com/auth/admin.directory.user.readonly
 *   3. Ejecutar los siguientes comandos para guardar los secrets en Firebase:
 *      firebase functions:secrets:set WORKSPACE_SYNC_SA_KEY   <- JSON completo del service account
 *      firebase functions:secrets:set WORKSPACE_ADMIN_EMAIL   <- email de un admin de Google Workspace
 */
export const syncWorkspaceUsers = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '256MB',
    secrets: ['WORKSPACE_SYNC_SA_KEY', 'WORKSPACE_ADMIN_EMAIL'],
  })
  .pubsub
  .schedule('0 6 * * *')
  .timeZone('America/Mexico_City')
  .onRun(async (_context) => {
    const DOMAIN = 'avivacredito.com';
    const saKeyJson = process.env.WORKSPACE_SYNC_SA_KEY;
    const adminEmail = process.env.WORKSPACE_ADMIN_EMAIL;

    if (!saKeyJson || !adminEmail) {
      console.error('syncWorkspaceUsers: secrets no configurados (WORKSPACE_SYNC_SA_KEY, WORKSPACE_ADMIN_EMAIL), abortando');
      return null;
    }

    let saKey: any;
    try {
      saKey = JSON.parse(saKeyJson);
    } catch (e) {
      console.error('syncWorkspaceUsers: WORKSPACE_SYNC_SA_KEY no es JSON válido');
      return null;
    }

    // Cliente autenticado con domain-wide delegation
    const authClient = new google.auth.JWT({
      email: saKey.client_email,
      key: saKey.private_key,
      scopes: ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
      subject: adminEmail,
    });

    const adminSDK = google.admin({ version: 'directory_v1', auth: authClient });

    // Obtener todas las cuentas suspendidas del dominio (paginado)
    const suspendedEmails = new Set<string>();
    let pageToken: string | undefined;

    do {
      const res = await adminSDK.users.list({
        domain: DOMAIN,
        query: 'isSuspended=true',
        maxResults: 500,
        pageToken,
        fields: 'nextPageToken,users(primaryEmail,suspended)',
      });
      for (const u of res.data.users ?? []) {
        if (u.primaryEmail && u.suspended) {
          suspendedEmails.add(u.primaryEmail.toLowerCase());
        }
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    console.log(`syncWorkspaceUsers: ${suspendedEmails.size} cuenta(s) suspendida(s) encontradas en Google Workspace`);

    if (suspendedEmails.size === 0) {
      return null;
    }

    // Buscar usuarios activos en Firestore que coincidan con las cuentas suspendidas
    const firestore = admin.firestore();
    const snapshot = await firestore
      .collection('users')
      .where('status', '==', 'active')
      .get();

    const batch = firestore.batch();
    let count = 0;
    const deactivatedEmails: string[] = [];

    snapshot.docs.forEach((docSnap) => {
      const email = ((docSnap.data().email as string) || '').toLowerCase();
      if (suspendedEmails.has(email)) {
        batch.update(docSnap.ref, {
          status: 'inactive',
          deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
          deactivatedBy: 'workspace_sync_auto',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        count++;
        deactivatedEmails.push(email);
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`syncWorkspaceUsers: ${count} usuario(s) marcado(s) como inactive:`, deactivatedEmails);

      // Registrar en audit_logs
      await firestore.collection('audit_logs').add({
        type: 'workspace_sync',
        deactivatedCount: count,
        deactivatedEmails,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      console.log('syncWorkspaceUsers: ningún usuario de Firestore coincide con cuentas suspendidas');
    }

    return null;
  });
