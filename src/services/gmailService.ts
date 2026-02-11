// src/services/gmailService.ts
// Envía correos usando la cuenta de Google del usuario ya autenticado en Firebase.
// No requiere contraseñas, SMTP ni API keys externas.
// Usa OAuth2 de Firebase (reauthenticateWithPopup) para obtener un token de Gmail.
import { GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { auth } from '../config/firebase';

// RFC 2047: encode Subject para soportar caracteres especiales (acentos, eñes, etc.)
function encodeSubject(text: string): string {
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(text)))}?=`;
}

// Construye un mensaje RFC 2822 codificado en base64url, formato que espera Gmail API
function buildRawMessage(from: string, to: string[], subject: string, html: string): string {
  const htmlB64 = btoa(unescape(encodeURIComponent(html)));
  const lines = [
    `From: ${from}`,
    `To: ${to.join(', ')}`,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    htmlB64,
  ];
  const raw = lines.join('\r\n');
  // base64url (sin +, /, ni padding =)
  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendViaGmail({
  to,
  subject,
  html,
}: {
  to: string[];
  subject: string;
  html: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('No hay sesión activa.');

  // Pedimos un token fresco con el scope de Gmail.
  // La primera vez Google muestra la pantalla de permisos (~3 seg).
  // Las siguientes veces el popup abre y cierra solo.
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/gmail.send');

  let accessToken: string;
  try {
    const result = await reauthenticateWithPopup(user, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) throw new Error('No se recibió token de Google.');
    accessToken = credential.accessToken;
  } catch (err: any) {
    if (err.code === 'auth/popup-closed-by-user') {
      throw new Error('Cerraste la ventana de Google antes de autorizar. Intenta de nuevo.');
    }
    throw new Error(`No se pudo obtener acceso a Gmail: ${err.message ?? err}`);
  }

  const from = user.displayName ? `${user.displayName} <${user.email}>` : user.email;
  const raw = buildRawMessage(from, to, subject, html);

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const msg: string = body?.error?.message ?? `Error ${response.status}`;
    // Mensaje amigable si la API de Gmail no está habilitada
    if (response.status === 403 && msg.includes('Gmail API')) {
      throw new Error(
        'La Gmail API no está habilitada en tu proyecto de Google Cloud. ' +
        'Ve a console.cloud.google.com → APIs → Gmail API → Habilitar.'
      );
    }
    throw new Error(`Gmail: ${msg}`);
  }
}
