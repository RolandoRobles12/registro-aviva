# Deploy de Cloud Functions — Inicio Rápido

## TL;DR

```bash
firebase use --add                             # configura .firebaserc
cp /ruta/serviceAccountKey.json functions/serviceAccountKey.json
cd functions && npm install && cd ..
firebase deploy --only functions
firebase functions:log
```

---

## Prerrequisitos

- Node.js 18+, npm 9+
- `firebase-tools` >= 12: `npm install -g firebase-tools`
- Cuenta de Google Cloud con Cloud Vision API habilitada en el mismo proyecto Firebase
- Service Account JSON con roles `Cloud Vision AI Service Agent` + `Storage Object Viewer`

---

## Diagnóstico inicial

Scripts de diagnóstico incluidos en la raíz:

```bash
# Linux / macOS
./diagnostico-firebase.sh

# Windows PowerShell
.\diagnostico-firebase.ps1
```

Reportan el estado de: `.firebaserc`, `functions/serviceAccountKey.json`, functions desplegadas y conectividad con Firebase.

---

## Paso 1 — Configurar proyecto Firebase

```bash
firebase login
firebase use --add   # asignar alias "default"
```

Genera `.firebaserc`:
```json
{
  "projects": {
    "default": "<project-id>"
  }
}
```

Alternativa manual si ya conoces el project ID:
```bash
echo '{"projects":{"default":"<project-id>"}}' > .firebaserc
```

---

## Paso 2 — Credenciales de Vision API

```bash
mv ~/Downloads/<credentials>.json functions/serviceAccountKey.json
ls -la functions/serviceAccountKey.json   # verificar
```

El archivo está en `.gitignore`. No lo comitas. Para opciones de autenticación en producción, ver [GOOGLE_CLOUD_CREDENTIALS.md](GOOGLE_CLOUD_CREDENTIALS.md).

---

## Paso 3 — Instalar dependencias de Functions

```bash
cd functions && npm install && cd ..
```

Dependencias instaladas: `@google-cloud/vision ^4`, `firebase-admin ^12`, `firebase-functions ^5`.

---

## Paso 4 — Deploy

```bash
firebase deploy --only functions
```

`firebase.json` tiene configurado el predeploy `tsc` automáticamente, no hace falta `npm run build` manual.

Salida esperada:
```
functions[validatePhotoOnUpload(us-central1)] Successful create operation.
functions[manualPhotoReview(us-central1)]     Successful create operation.
```

Tiempo estimado: 2–5 min.

---

## Paso 5 — Verificación

```bash
# Listar functions activas
firebase functions:list

# Tail de logs
firebase functions:log --only validatePhotoOnUpload
```

Para verificar end-to-end: hacer un check-in desde la app y confirmar que el documento en `checkins/{id}` tiene el campo `photoValidation` populado:

```json
{
  "photoValidation": {
    "status": "auto_approved",
    "confidence": 0.85,
    "personDetected": true,
    "uniformDetected": true,
    "processingTime": 1523
  }
}
```

---

## Scoring de validación

| Factor | Peso |
|---|---|
| Persona detectada | 40% |
| Color verde uniforme | 30% |
| Ropa/uniforme | 15% |
| Ambiente (retail/tienda) | 10% |
| Logo corporativo | 5% |

| Score final | Estado |
|---|---|
| ≥ 0.70 | `auto_approved` |
| 0.51 – 0.69 | `needs_review` |
| ≤ 0.50 | `rejected` |

Umbrales configurables en `VALIDATION_CONFIG` → `functions/src/photoValidation.ts`.

---

## Checklist de deploy

- [ ] `.firebaserc` con project ID correcto (`firebase projects:list`)
- [ ] `functions/serviceAccountKey.json` presente
- [ ] `cd functions && npm install` sin errores
- [ ] `firebase deploy --only functions` exitoso
- [ ] `firebase functions:list` muestra `validatePhotoOnUpload` y `manualPhotoReview`
- [ ] `firebase functions:log` sin errores en arranque
- [ ] Campo `photoValidation` escrito en Firestore tras un check-in de prueba

---

## Referencia rápida de comandos

```bash
firebase projects:list
firebase functions:list
firebase functions:log --limit 50
firebase functions:log --only validatePhotoOnUpload
firebase deploy --only functions --dry-run   # simular sin desplegar
firebase deploy --only functions --force     # forzar re-deploy
firebase emulators:start                     # emuladores locales (Auth/Firestore/Storage)
```

---

## Documentación relacionada

- [GOOGLE_CLOUD_CREDENTIALS.md](GOOGLE_CLOUD_CREDENTIALS.md) — Estrategias de autenticación (env var, Firebase Secrets, credenciales en código)
- [GOOGLE_VISION_SETUP.md](GOOGLE_VISION_SETUP.md) — Habilitación de API, billing y personalización de umbrales
- [TROUBLESHOOTING_VALIDACIONES.md](TROUBLESHOOTING_VALIDACIONES.md) — Diagnóstico de errores comunes
