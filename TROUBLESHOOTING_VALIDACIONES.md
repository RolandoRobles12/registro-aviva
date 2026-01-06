# 🔍 Diagnóstico y Solución: Validaciones de Fotos No Funcionan

## Problemas Identificados:

### 1. ❌ Falta archivo `.firebaserc`
Firebase CLI no sabe qué proyecto usar.

### 2. ❓ Cloud Functions no están desplegadas
Las validaciones de fotos requieren Cloud Functions activas.

### 3. ❓ Credenciales de Google Cloud Vision no configuradas
Necesitas el archivo `serviceAccountKey.json` en `functions/`

---

## 🛠️ Solución Paso a Paso:

### PASO 1: Configurar el Proyecto de Firebase

Ejecuta este comando en la raíz del proyecto (donde está `firebase.json`):

```bash
firebase use --add
```

Te pedirá:
1. Seleccionar tu proyecto de Firebase de la lista
2. Asignarle un alias (usa `default`)

Esto creará el archivo `.firebaserc` automáticamente.

**Alternativa (si conoces tu project ID):**

Crea manualmente el archivo `.firebaserc` en la raíz del proyecto:

```json
{
  "projects": {
    "default": "TU-PROJECT-ID-AQUI"
  }
}
```

Reemplaza `TU-PROJECT-ID-AQUI` con tu project ID real (ej: `aviva-attendance-12345`).

---

### PASO 2: Verificar/Instalar Dependencias de Functions

```bash
cd functions
npm install
cd ..
```

---

### PASO 3: Colocar las Credenciales de Google Cloud Vision

1. Renombra tu archivo JSON de credenciales:
```bash
mv ruta/a/tu-archivo-descargado.json functions/serviceAccountKey.json
```

2. **IMPORTANTE**: Verifica que el archivo esté en la ubicación correcta:
```bash
ls -la functions/serviceAccountKey.json
```

Deberías ver el archivo listado.

---

### PASO 4: Desplegar Cloud Functions

Desde la raíz del proyecto:

```bash
firebase deploy --only functions
```

Este comando:
- Compilará las TypeScript functions
- Las desplegará a Firebase
- Mostrará las URLs de las functions desplegadas

**Salida esperada:**
```
✔  functions[validatePhotoOnUpload(us-central1)] Successful create operation.
✔  functions[manualPhotoReview(us-central1)] Successful create operation.
```

---

### PASO 5: Verificar que las Functions están activas

```bash
firebase functions:list
```

Deberías ver:
```
validatePhotoOnUpload(us-central1)
manualPhotoReview(us-central1)
```

---

### PASO 6: Ver los Logs de las Functions

Ahora sí podrás ver los logs:

```bash
firebase functions:log
```

O para ver logs en tiempo real:

```bash
firebase functions:log --only validatePhotoOnUpload
```

---

## 🧪 Probar el Sistema:

### 1. Hacer un Check-in con Foto

Ve a la aplicación web y haz un check-in con una foto.

### 2. Verificar en Firebase Console

Ve a: https://console.firebase.google.com/

1. **Firestore Database** → Colección `checkins` → Busca tu check-in reciente
2. Deberías ver el campo `photoValidation` con:
   ```json
   {
     "status": "auto_approved" | "rejected" | "needs_review",
     "confidence": 0.75,
     "personDetected": true,
     "uniformDetected": true,
     ...
   }
   ```

### 3. Verificar en Storage

Ve a: **Storage** → Carpeta `attendance-photos/2025/12/[userId]/`

Deberías ver tus fotos subidas.

### 4. Ver Logs en Consola

```bash
firebase functions:log --limit 20
```

Busca mensajes como:
```
Procesando validación de foto: attendance-photos/2025/12/...
Validación de foto completada: { status: 'auto_approved', confidence: 0.85 }
```

---

## ⚠️ Posibles Errores y Soluciones:

### Error: "No currently active project"
**Solución:** Ejecuta `firebase use --add` (Paso 1)

### Error: "Cannot find module 'serviceAccountKey.json'"
**Solución:**
```bash
# Verifica que el archivo existe
ls -la functions/serviceAccountKey.json

# Si no existe, cópialo
cp ruta/a/tu/archivo.json functions/serviceAccountKey.json
```

### Error: "Permission denied" en Google Cloud Vision
**Solución:**
1. Ve a Google Cloud Console → IAM
2. Verifica que tu Service Account tenga el rol "Cloud Vision AI Service Agent"
3. Verifica que Cloud Vision API esté habilitada

### Error: "GOOGLE_APPLICATION_CREDENTIALS not set"
**Solución:** El código ya maneja esto automáticamente, pero verifica que:
```bash
ls -la functions/serviceAccountKey.json
```

### Las fotos se suben pero no se validan
**Solución:**
1. Verifica que las Functions estén desplegadas:
   ```bash
   firebase functions:list
   ```
2. Verifica los logs:
   ```bash
   firebase functions:log --limit 50
   ```
3. Verifica el path de las fotos en Storage:
   - Debe ser: `attendance-photos/YYYY/MM/userId/checkInId_timestamp.jpg`
   - La function solo procesa fotos que empiezan con `attendance-photos/`

---

## 📊 Entender los Umbrales de Validación:

Con la configuración actual:

- **≥ 70%**: ✅ Auto-aprobada → `status: "auto_approved"`
- **51-69%**: ⚠️ Revisión manual → `status: "needs_review"`
- **≤ 50%**: ❌ Auto-rechazada → `status: "rejected"`

La confianza se calcula con estos pesos:
- **40%** - Persona detectada
- **30%** - Color verde del uniforme
- **15%** - Ropa/uniforme detectado
- **10%** - Ambiente/ubicación
- **5%** - Logo (opcional)

---

## 🎯 Comandos Rápidos de Diagnóstico:

```bash
# 1. Ver proyecto activo
firebase projects:list

# 2. Ver functions desplegadas
firebase functions:list

# 3. Ver logs recientes
firebase functions:log --limit 20

# 4. Ver logs en tiempo real
firebase functions:log --only validatePhotoOnUpload

# 5. Ver estado de despliegue
firebase deploy --only functions --dry-run

# 6. Re-desplegar functions (si hiciste cambios)
firebase deploy --only functions --force
```

---

## 📞 Si Nada Funciona:

1. **Verifica que Firebase esté inicializado correctamente:**
   ```bash
   firebase login
   firebase projects:list
   ```

2. **Revisa el archivo firebase.json** - debe tener la sección de functions

3. **Verifica las reglas de Storage** - deben permitir lectura a las functions

4. **Contacto:** Revisa los logs detallados con `firebase functions:log` y busca errores específicos

---

## ✅ Checklist Completo:

- [ ] Archivo `.firebaserc` existe y tiene el project ID correcto
- [ ] Dependencias instaladas: `cd functions && npm install`
- [ ] Archivo `functions/serviceAccountKey.json` existe
- [ ] Cloud Vision API habilitada en Google Cloud Console
- [ ] Service Account tiene permisos correctos (Cloud Vision AI Service Agent)
- [ ] Functions desplegadas: `firebase deploy --only functions`
- [ ] Functions visibles en: `firebase functions:list`
- [ ] Logs funcionan: `firebase functions:log`
- [ ] Fotos se suben a Storage en path `attendance-photos/...`
- [ ] Campo `photoValidation` aparece en Firestore después de subir foto

---

Sigue estos pasos en orden y las validaciones deberían comenzar a funcionar. ¡Avísame en qué paso te encuentras o si encuentras algún error!
