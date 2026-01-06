# 🚀 Inicio Rápido - Configuración de Validación de Fotos

## ⚡ Comandos Rápidos (Para Expertos)

Si ya conoces Firebase, ejecuta esto:

```bash
# 1. Configurar proyecto
firebase use --add

# 2. Copiar credenciales
cp ruta/a/tu/credenciales.json functions/serviceAccountKey.json

# 3. Instalar y desplegar
cd functions && npm install && cd ..
firebase deploy --only functions

# 4. Ver logs
firebase functions:log
```

---

## 📋 Paso a Paso Detallado

### Requisitos Previos:
- ✅ Node.js instalado
- ✅ Firebase CLI instalado (`npm install -g firebase-tools`)
- ✅ Cuenta de Google Cloud con Vision API habilitada
- ✅ Archivo JSON de credenciales de Service Account descargado

---

### PASO 1: Diagnóstico Inicial

**Windows:**
```powershell
.\diagnostico-firebase.ps1
```

**Linux/Mac:**
```bash
./diagnostico-firebase.sh
```

Este script te dirá exactamente qué falta configurar.

---

### PASO 2: Configurar Proyecto de Firebase

Ejecuta en la raíz del proyecto:

```bash
firebase login
firebase use --add
```

Selecciona tu proyecto de la lista y asigna el alias `default`.

Esto creará el archivo `.firebaserc`:
```json
{
  "projects": {
    "default": "tu-project-id"
  }
}
```

**¿No tienes proyecto?** Créalo en: https://console.firebase.google.com/

---

### PASO 3: Colocar Credenciales de Google Cloud Vision

Renombra y mueve tu archivo de credenciales:

**Windows:**
```powershell
Move-Item "C:\Downloads\tu-archivo-credenciales.json" "functions\serviceAccountKey.json"
```

**Linux/Mac:**
```bash
mv ~/Downloads/tu-archivo-credenciales.json functions/serviceAccountKey.json
```

**Verificar:**
```bash
ls -la functions/serviceAccountKey.json
```

⚠️ **IMPORTANTE:** Nunca subas este archivo a Git (ya está protegido en `.gitignore`)

---

### PASO 4: Instalar Dependencias

```bash
cd functions
npm install
cd ..
```

Esto instalará:
- `@google-cloud/vision` - Para análisis de imágenes
- `firebase-admin` - Para Firebase en servidor
- `firebase-functions` - Para Cloud Functions

---

### PASO 5: Desplegar Cloud Functions

```bash
firebase deploy --only functions
```

**Salida esperada:**
```
✔  functions[validatePhotoOnUpload(us-central1)] Successful create operation.
✔  functions[manualPhotoReview(us-central1)] Successful create operation.

Functions deployed:
  validatePhotoOnUpload(us-central1)
  manualPhotoReview(us-central1)
```

⏱️ **Tiempo estimado:** 2-5 minutos

---

### PASO 6: Verificar que Funciona

#### Opción A: Ver Functions Activas
```bash
firebase functions:list
```

Deberías ver:
- `validatePhotoOnUpload(us-central1)`
- `manualPhotoReview(us-central1)`

#### Opción B: Ver Logs en Tiempo Real
```bash
firebase functions:log --only validatePhotoOnUpload
```

#### Opción C: Hacer un Check-in de Prueba

1. Ve a tu aplicación web
2. Haz un check-in con una foto
3. Espera 5-10 segundos
4. Revisa en Firestore → colección `checkins` → tu check-in
5. Deberías ver el campo `photoValidation` con:
   ```json
   {
     "status": "auto_approved",
     "confidence": 0.85,
     "personDetected": true,
     "uniformDetected": true,
     ...
   }
   ```

---

## 🎯 Entender los Resultados

### Estados de Validación:

| Confianza | Estado | Descripción |
|-----------|--------|-------------|
| ≥ 70% | `auto_approved` ✅ | Aprobada automáticamente |
| 51-69% | `needs_review` ⚠️ | Requiere revisión manual |
| ≤ 50% | `rejected` ❌ | Rechazada automáticamente |

### Factores de Validación:

El sistema analiza:
- **40%** - Persona presente en la foto
- **30%** - Color verde del uniforme Aviva
- **15%** - Ropa/uniforme detectado
- **10%** - Ambiente/ubicación (tienda/kiosco)
- **5%** - Logo de la empresa (opcional)

---

## 🔧 Solución de Problemas Comunes

### "No currently active project"
```bash
firebase use --add
```

### "Cannot find module 'serviceAccountKey.json'"
Verifica la ubicación:
```bash
ls -la functions/serviceAccountKey.json
```

### Las fotos se suben pero no se validan
1. Verifica que las functions estén desplegadas:
   ```bash
   firebase functions:list
   ```
2. Revisa los logs:
   ```bash
   firebase functions:log --limit 50
   ```

### "Permission denied" en Google Cloud
1. Ve a: https://console.cloud.google.com/iam-admin/iam
2. Verifica que tu Service Account tenga: **Cloud Vision AI Service Agent**
3. Verifica que Cloud Vision API esté habilitada

---

## 📚 Documentación Completa

Para problemas más complejos, consulta:
- 📖 [TROUBLESHOOTING_VALIDACIONES.md](TROUBLESHOOTING_VALIDACIONES.md) - Diagnóstico detallado
- 🔑 [GOOGLE_CLOUD_CREDENTIALS.md](GOOGLE_CLOUD_CREDENTIALS.md) - Configuración de credenciales
- 🔧 [GOOGLE_VISION_SETUP.md](GOOGLE_VISION_SETUP.md) - Setup de Google Cloud Vision

---

## ✅ Checklist Final

Antes de considerar que está todo listo:

- [ ] `firebase projects:list` muestra tu proyecto
- [ ] Archivo `.firebaserc` existe con tu project ID
- [ ] `functions/serviceAccountKey.json` existe
- [ ] `cd functions && npm install` ejecutado sin errores
- [ ] `firebase deploy --only functions` completado exitosamente
- [ ] `firebase functions:list` muestra 2 functions activas
- [ ] `firebase functions:log` muestra logs sin errores
- [ ] Una foto de prueba fue validada correctamente
- [ ] Campo `photoValidation` aparece en Firestore

---

## 🆘 ¿Necesitas Ayuda?

1. **Ejecuta el diagnóstico:**
   ```bash
   # Windows
   .\diagnostico-firebase.ps1

   # Linux/Mac
   ./diagnostico-firebase.sh
   ```

2. **Revisa los logs:**
   ```bash
   firebase functions:log --limit 50
   ```

3. **Consulta la documentación detallada** en los archivos MD mencionados arriba

---

¡Listo! Si todo está ✅, las fotos de check-in ahora se validarán automáticamente con Google Cloud Vision API.
