# Troubleshooting — Validaciones de Fotos

## Diagnóstico rápido

```bash
# Estado general
firebase projects:list
firebase functions:list
firebase functions:log --limit 30

# Simular deploy sin ejecutar
firebase deploy --only functions --dry-run
```

Scripts de diagnóstico automatizado incluidos en la raíz:
```bash
./diagnostico-firebase.sh    # Linux / macOS
.\diagnostico-firebase.ps1   # Windows PowerShell
```

---

## Errores por categoría

### Firebase / CLI

**`No currently active project`**
```bash
firebase use --add   # seleccionar proyecto y asignar alias "default"
# o manualmente:
echo '{"projects":{"default":"<project-id>"}}' > .firebaserc
```

**`firebase functions:list` no muestra las funciones**

Las functions no están desplegadas o el deploy falló silenciosamente.
```bash
firebase deploy --only functions
firebase functions:list   # debe mostrar validatePhotoOnUpload y manualPhotoReview
```

**Functions desplegadas pero sin dispararse**

Verificar que el path de la foto en Storage empiece con `attendance-photos/`. La function tiene un filtro de path en `functions/src/index.ts`:
```typescript
functions.storage.object().onFinalize(async (object) => {
  if (!object.name?.startsWith('attendance-photos/')) return;
  // ...
});
```

---

### Credenciales / Autenticación

**`Cannot find module 'serviceAccountKey.json'`**
```bash
ls -la functions/serviceAccountKey.json
# Si no existe:
cp /ruta/credenciales.json functions/serviceAccountKey.json
```

**`GOOGLE_APPLICATION_CREDENTIALS not set`**

En desarrollo local con emuladores, exportar antes de iniciar:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/functions/serviceAccountKey.json"
firebase emulators:start
```

En producción, usar Firebase Secrets (ver [GOOGLE_CLOUD_CREDENTIALS.md](GOOGLE_CLOUD_CREDENTIALS.md)).

**`PERMISSION_DENIED` / `Permission denied`**

El Service Account no tiene los roles necesarios. Verificar en:
```
GCP Console → IAM & Admin → IAM → buscar el SA
```

Roles requeridos:
- `Cloud Vision AI Service Agent`
- `Storage Object Viewer`

---

### Vision API

**`Vision API is not enabled` / `API not enabled`**
```
GCP Console → APIs & Services → Library → Cloud Vision API → Enable
```
O via CLI:
```bash
gcloud services enable vision.googleapis.com --project=<project-id>
```

**`Billing account not configured`**

Vision API requiere billing activo aunque no se supere el free tier (1,000 imgs/mes).
```
GCP Console → Billing → Link a billing account
```

**Validaciones siempre en `needs_review`**

Causas posibles:
1. Umbrales demasiado altos → bajar `AUTO_APPROVE_THRESHOLD` en `VALIDATION_CONFIG`
2. Fotos de baja calidad / mal iluminadas
3. Etiquetas de uniforme no coinciden → ajustar `UNIFORM_LABELS`

Inspeccionar los labels crudos que Vision API está devolviendo:
```bash
firebase functions:log --only validatePhotoOnUpload --limit 20
# Buscar líneas con "labels:" para ver qué detecta Vision API
```

**Validaciones siempre en `rejected`**

Mismo diagnóstico que `needs_review`. Subir `AUTO_REJECT_THRESHOLD` temporalmente para forzar `needs_review` y depurar.

---

### Storage / Firestore

**Fotos se suben pero `photoValidation` no aparece en Firestore**

1. Confirmar que las functions estén desplegadas:
   ```bash
   firebase functions:list
   ```
2. Confirmar el path de Storage:
   ```
   Firebase Console → Storage → attendance-photos/YYYY/MM/<userId>/<checkInId>_<timestamp>.jpg
   ```
   Si el path no sigue ese patrón, la function no se dispara.

3. Revisar logs en busca de errores de escritura en Firestore:
   ```bash
   firebase functions:log --limit 50
   ```

**`photoValidation.status` se queda en `pending`**

La function se disparó pero encontró un error antes de escribir el resultado. Buscar en logs:
```bash
firebase functions:log --only validatePhotoOnUpload
# Buscar "Error" o "Exception"
```

---

## Entender el scoring

La confianza final se calcula como suma ponderada en `functions/src/photoValidation.ts`:

```
confidence = (personScore * 0.40)
           + (uniformColorScore * 0.30)
           + (clothingScore * 0.15)
           + (locationScore * 0.10)
           + (logoScore * 0.05)
```

Umbrales de decisión (configurables en `VALIDATION_CONFIG`):

| Rango | Estado |
|---|---|
| ≥ 0.70 | `auto_approved` |
| 0.51 – 0.69 | `needs_review` |
| ≤ 0.50 | `rejected` |

Para ajustar la sensibilidad del sistema, modificar `VALIDATION_CONFIG` y re-deployar:
```bash
firebase deploy --only functions
```

---

## Referencia de comandos de diagnóstico

```bash
firebase projects:list                                    # proyectos disponibles
firebase use                                              # proyecto activo
firebase functions:list                                   # functions desplegadas
firebase functions:log --limit 50                         # logs recientes
firebase functions:log --only validatePhotoOnUpload       # logs de función específica
firebase deploy --only functions --dry-run                # simular deploy
firebase deploy --only functions --force                  # forzar re-deploy
firebase deploy --only firestore                          # re-deployar reglas e índices
```

---

## Checklist de validación completo

- [ ] `.firebaserc` con project ID correcto
- [ ] `functions/serviceAccountKey.json` presente (desarrollo) o Firebase Secret configurado (producción)
- [ ] Cloud Vision API habilitada en GCP Console
- [ ] Service Account con roles `Cloud Vision AI Service Agent` + `Storage Object Viewer`
- [ ] Billing activo en GCP
- [ ] `firebase deploy --only functions` exitoso
- [ ] `firebase functions:list` muestra `validatePhotoOnUpload` y `manualPhotoReview`
- [ ] Fotos subidas a Storage bajo el path `attendance-photos/...`
- [ ] Campo `photoValidation` escrito en Firestore tras check-in de prueba
- [ ] `firebase functions:log` sin errores de autenticación ni de Vision API
