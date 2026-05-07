# Credenciales de Google Cloud Vision — Service Account

## Roles requeridos en IAM

El Service Account necesita estos roles en el proyecto GCP:

| Rol | Propósito |
|---|---|
| `Cloud Vision AI Service Agent` | Llamadas a Vision API |
| `Storage Object Viewer` | Leer imágenes de Firebase Storage |
| `Firebase Admin` (opcional) | Operaciones admin completas |

Verificar en: `console.cloud.google.com/iam-admin/iam` → buscar el SA con formato `nombre@<project-id>.iam.gserviceaccount.com`.

---

## Obtener el archivo JSON

1. GCP Console → IAM & Admin → Service Accounts
2. Seleccionar el SA con los roles anteriores (o crear uno nuevo)
3. Keys → Add Key → Create new key → JSON
4. Descargar y renombrar a `serviceAccountKey.json`

El archivo ya está en `.gitignore`. **No comitas este archivo en ningún caso.**

---

## Opciones de configuración

### Opción 1 — Archivo local (desarrollo)

Colocar el JSON en `functions/`:

```bash
mv ~/Downloads/<credentials>.json functions/serviceAccountKey.json
```

`functions/src/photoValidation.ts` lo carga con `require('../serviceAccountKey.json')`. Funciona para desarrollo local y con emuladores.

**No apto para producción** — el archivo se incluiría en el bundle desplegado.

---

### Opción 2 — Firebase Secrets (producción, recomendado)

Almacena las credenciales cifradas en Secret Manager, inaccesibles desde el código fuente.

```bash
# Convertir JSON a base64 (una sola línea)
cat functions/serviceAccountKey.json | base64 -w 0 > /tmp/creds_b64.txt

# Crear secret
firebase functions:secrets:set GOOGLE_CREDENTIALS < /tmp/creds_b64.txt

# Verificar
firebase functions:secrets:access GOOGLE_CREDENTIALS
```

Actualizar `functions/src/index.ts` para consumirlo:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ImageAnnotatorClient } from '@google-cloud/vision';

admin.initializeApp();

// Decodificar credenciales del secret en runtime
const rawSecret = process.env.GOOGLE_CREDENTIALS;
if (rawSecret) {
  const credentials = JSON.parse(Buffer.from(rawSecret, 'base64').toString('utf8'));
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify(credentials);
}
```

Deploy con secrets:
```bash
firebase deploy --only functions --force
```

---

### Opción 3 — Variable de entorno (CI/CD o entornos efímeros)

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/abs/path/to/serviceAccountKey.json"
firebase emulators:start
```

Útil en pipelines de CI donde el archivo se inyecta como artifact de build.

---

## Verificar autenticación tras el deploy

```bash
firebase functions:log
```

Logs esperados al procesar una foto:
```
Procesando validación de foto: attendance-photos/2025/12/...
Validación completada: { checkInId: '...', status: 'auto_approved', confidence: 0.85 }
```

Errores de autenticación típicos:

| Error | Causa | Solución |
|---|---|---|
| `Cannot find module 'serviceAccountKey.json'` | Archivo no copiado a `functions/` | Opción 1: copiar el JSON |
| `GOOGLE_APPLICATION_CREDENTIALS not set` | Variable de entorno ausente | Opción 2 (Secrets) o Opción 3 (env var) |
| `Permission denied` | SA sin roles correctos | Revisar IAM en GCP Console |
| `Cloud Vision API not enabled` | API deshabilitada | Habilitar en APIs & Services → Library |

---

## Rotación de credenciales

- Rotar el Service Account key cada 90 días como mínimo.
- Usar SA distintos para entornos dev y prod.
- Al rotar: crear nueva key → actualizar secret con `firebase functions:secrets:set` → eliminar key antigua en GCP.

```bash
# Actualizar secret con nueva key
cat new_serviceAccountKey.json | base64 -w 0 | firebase functions:secrets:set GOOGLE_CREDENTIALS
firebase deploy --only functions --force
```
