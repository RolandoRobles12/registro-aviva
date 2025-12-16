# Configuración de Credenciales de Google Cloud Vision

## Paso 1: Guardar el archivo JSON de Service Account

1. Ya tienes el archivo JSON generado desde Google Cloud Console
2. **IMPORTANTE**: Renombra el archivo a `serviceAccountKey.json`
3. Coloca el archivo en el directorio `functions/`:

```bash
mv /ruta/a/tu/archivo-descargado.json /home/user/registro-aviva/functions/serviceAccountKey.json
```

**NUNCA subas este archivo al repositorio Git** - Ya está protegido en `.gitignore`

---

## Paso 2: Configurar las credenciales en Firebase Functions

Tienes **3 opciones** para configurar las credenciales:

### 🟢 OPCIÓN 1: Usar variable de entorno local (DESARROLLO)

Para pruebas locales:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/home/user/registro-aviva/functions/serviceAccountKey.json"
```

### 🟢 OPCIÓN 2: Usar Firebase Secrets (PRODUCCIÓN - RECOMENDADO)

Esta es la forma más segura para producción:

1. Instalar Firebase CLI (si no lo tienes):
```bash
npm install -g firebase-tools
firebase login
```

2. Convertir el archivo JSON a base64:
```bash
cat functions/serviceAccountKey.json | base64 -w 0 > /tmp/credentials_base64.txt
```

3. Crear el secret en Firebase:
```bash
firebase functions:secrets:set GOOGLE_CREDENTIALS < /tmp/credentials_base64.txt
```

4. Actualizar `functions/src/index.ts` para usar el secret:
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Inicializar Firebase Admin
admin.initializeApp();

// Configurar Vision API con credenciales del secret
const credentials = functions.config().google?.credentials
  ? JSON.parse(Buffer.from(functions.config().google.credentials, 'base64').toString())
  : undefined;

if (credentials) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = JSON.stringify(credentials);
}
```

5. Desplegar las functions con el secret:
```bash
firebase deploy --only functions --force
```

### 🟢 OPCIÓN 3: Configuración automática en el código (SIMPLE)

Esta opción funciona si el archivo `serviceAccountKey.json` está en el directorio `functions/`:

Actualizar `functions/src/photoValidation.ts`:

```typescript
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { File } from '@google-cloud/storage';
import * as path from 'path';

// Configurar credenciales explícitamente
const credentials = require(path.join(__dirname, '../serviceAccountKey.json'));

const visionClient = new ImageAnnotatorClient({
  credentials: credentials,
});
```

**IMPORTANTE**: Esta opción solo funciona si despliegas el archivo junto con las functions (no recomendado para producción).

---

## Paso 3: Verificar configuración de permisos en Google Cloud

Asegúrate de que tu Service Account tenga estos roles:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/iam-admin/iam)
2. Busca tu service account (formato: `nombre@proyecto.iam.gserviceaccount.com`)
3. Verifica que tenga estos permisos:
   - ✅ **Cloud Vision AI Service Agent**
   - ✅ **Storage Object Viewer** (para leer fotos de Firebase Storage)
   - ✅ **Firebase Admin** (opcional, para operaciones completas)

---

## Paso 4: Habilitar Google Cloud Vision API

1. Ve a [Google Cloud Console - APIs](https://console.cloud.google.com/apis/library)
2. Busca "Cloud Vision API"
3. Haz clic en "Enable" (Habilitar)
4. Configura billing si es necesario (tiene tier gratuito de 1,000 imágenes/mes)

---

## Paso 5: Desplegar las Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

---

## Verificar que funciona

Después de desplegar, verifica los logs:

```bash
firebase functions:log
```

Deberías ver logs como:
```
Procesando validación de foto: attendance-photos/2025/12/...
Validación de foto completada: { checkInId: '...', status: 'auto_approved', confidence: 0.85 }
```

---

## Troubleshooting

### Error: "Cannot find module 'serviceAccountKey.json'"
- Verifica que el archivo esté en `functions/serviceAccountKey.json`
- Verifica que el nombre del archivo sea exacto (sin espacios ni mayúsculas)

### Error: "Permission denied"
- Verifica que el Service Account tenga los roles correctos en IAM
- Verifica que Cloud Vision API esté habilitada
- Verifica que billing esté configurado en Google Cloud

### Error: "GOOGLE_APPLICATION_CREDENTIALS not set"
- Usa la Opción 2 (Firebase Secrets) para producción
- Usa la Opción 3 (credenciales en código) para desarrollo local

---

## ⚠️ Seguridad

**NUNCA HAGAS ESTO:**
- ❌ Subir `serviceAccountKey.json` al repositorio
- ❌ Compartir el archivo JSON por email o chat
- ❌ Hardcodear las credenciales en el código

**SIEMPRE HAZ ESTO:**
- ✅ Usar Firebase Secrets para producción
- ✅ Mantener el archivo en `.gitignore`
- ✅ Rotar las credenciales cada 90 días
- ✅ Usar diferentes service accounts para dev/prod
