# Google Cloud Vision API — Setup y Configuración

## Prerrequisitos

- Proyecto Firebase activo (mismo proyecto en GCP)
- Billing habilitado en la cuenta GCP (requerido por Vision API aunque exista free tier)
- Node.js 18, Firebase CLI >= 12

---

## 1. Habilitar Cloud Vision API

```
GCP Console → APIs & Services → Library → buscar "Cloud Vision API" → Enable
```

Verificar que esté activa:
```
GCP Console → APIs & Services → Enabled APIs & services → "Cloud Vision API"
```

O via CLI:
```bash
gcloud services enable vision.googleapis.com --project=<project-id>
```

---

## 2. Billing

La API requiere una cuenta de facturación activa. El free tier cubre las primeras 1,000 imágenes/mes.

| Imágenes/mes | Costo Vision API |
|---|---|
| 0 – 1,000 | $0 (free tier) |
| 1,001 – 5,000,000 | $1.50 / 1,000 imágenes |

Estimación según volumen de check-ins:

| Check-ins/mes | Costo aprox. |
|---|---|
| ≤ 1,000 | $0 |
| 5,000 | ~$6 USD |
| 10,000 | ~$13.50 USD |
| 20,000 | ~$28.50 USD |

Configurar alertas de presupuesto:
```
GCP Console → Billing → Budgets & alerts → Create Budget
```

Monitorear requests y cuota:
```
GCP Console → APIs & Services → Dashboard → Cloud Vision API → Metrics
```

---

## 3. Dependencias de Cloud Functions

```bash
cd functions
npm install
```

Paquetes relevantes (`functions/package.json`):

```json
{
  "dependencies": {
    "@google-cloud/vision": "^4.0.2",
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  }
}
```

---

## 4. Autenticación

Si las Cloud Functions corren en el mismo proyecto GCP que Firebase, el Service Account por defecto ya tiene permisos para usar Vision API en ese proyecto — no se necesita configuración adicional de credenciales en la mayoría de los casos.

Si se usa un proyecto GCP separado o un Service Account específico, ver [GOOGLE_CLOUD_CREDENTIALS.md](GOOGLE_CLOUD_CREDENTIALS.md).

---

## 5. Build y Deploy

```bash
# Desde la raíz del proyecto
firebase deploy --only functions
```

El predeploy definido en `firebase.json` ejecuta `tsc` automáticamente antes de cada deploy. No es necesario compilar manualmente.

Funciones desplegadas:

| Función | Runtime | Trigger |
|---|---|---|
| `validatePhotoOnUpload` | Node 18 / us-central1 | `storage.object().onFinalize()` — path `attendance-photos/**` |
| `manualPhotoReview` | Node 18 / us-central1 | HTTPS Callable |

---

## 6. Testing

### Emuladores (sin consumir cuota de Vision API)

```bash
# Terminal 1
firebase emulators:start   # UI en http://localhost:4000

# Terminal 2
npm run dev                # App en http://localhost:5173
```

Los emuladores emulan Auth, Firestore y Storage. La llamada real a Vision API sigue ocurriendo desde los emuladores a menos que se mockee explícitamente.

### Validación end-to-end en producción

1. Hacer check-in desde la app con una foto
2. Esperar 5–15 segundos (tiempo de procesamiento de la Cloud Function)
3. Verificar en Firestore Console → `checkins/{checkInId}` → campo `photoValidation`:

```json
{
  "photoValidation": {
    "status": "auto_approved",
    "confidence": 0.89,
    "personDetected": true,
    "personConfidence": 0.95,
    "uniformDetected": true,
    "uniformConfidence": 0.82,
    "logoDetected": false,
    "logoConfidence": 0,
    "locationValid": true,
    "locationConfidence": 0.78,
    "isRealPhoto": true,
    "labels": [
      { "description": "Person", "score": 0.95 },
      { "description": "Clothing", "score": 0.82 },
      { "description": "Retail", "score": 0.78 }
    ],
    "processingTime": 1523
  }
}
```

---

## 7. Personalizar umbrales y etiquetas

Editar `functions/src/photoValidation.ts`:

```typescript
const VALIDATION_CONFIG = {
  MIN_PERSON_CONFIDENCE: 0.7,
  MIN_UNIFORM_CONFIDENCE: 0.6,
  MIN_LOGO_CONFIDENCE: 0.5,
  AUTO_APPROVE_THRESHOLD: 0.70,   // ≥ este valor → auto_approved
  AUTO_REJECT_THRESHOLD: 0.50,    // ≤ este valor → rejected
  EXPECTED_LOGOS: ['Aviva', 'BA', 'Construrama'],
  UNIFORM_LABELS: ['Clothing', 'Uniform', 'Green'],
  LOCATION_LABELS: ['Retail', 'Store', 'Tienda', 'Ferretería', 'Almacén'],
};
```

Re-deploy tras cambios:
```bash
firebase deploy --only functions
```

---

## 8. Monitoreo de logs

```bash
# Tail en tiempo real
firebase functions:log --only validatePhotoOnUpload

# Últimos N registros
firebase functions:log --limit 50
```

Desde Firebase Console: Functions → Logs → filtrar por función.

---

## Troubleshooting rápido

| Error | Solución |
|---|---|
| `Vision API is not enabled` | Habilitar en GCP Console (paso 1) |
| `Billing account not configured` | Agregar billing en GCP Console (paso 2) |
| `PERMISSION_DENIED` | Verificar roles del SA en IAM |
| Siempre devuelve `needs_review` | Bajar `AUTO_APPROVE_THRESHOLD` o revisar calidad de fotos |
| Function no se dispara | Verificar que el path en Storage empiece con `attendance-photos/` |

Ver diagnóstico completo en [TROUBLESHOOTING_VALIDACIONES.md](TROUBLESHOOTING_VALIDACIONES.md).

---

## Referencias

- [Cloud Vision API Docs](https://cloud.google.com/vision/docs)
- [Cloud Vision Pricing](https://cloud.google.com/vision/pricing)
- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Vision API Feature List](https://cloud.google.com/vision/docs/features-list)
