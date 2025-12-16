# 📸 Configuración de Google Cloud Vision API

Esta guía te ayudará a configurar Google Cloud Vision API para validar automáticamente las fotos de check-in.

## 📋 Requisitos Previos

- Proyecto de Firebase activo
- Cuenta de Google Cloud
- Node.js 18 o superior
- Firebase CLI instalado (`npm install -g firebase-tools`)

---

## 🚀 Paso 1: Habilitar Google Cloud Vision API

### 1.1 Ir a Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto de Firebase (mismo proyecto que usas para Firestore/Storage)

### 1.2 Habilitar Vision API

1. En el menú lateral, ve a **"APIs & Services" → "Library"**
2. Busca **"Cloud Vision API"**
3. Haz clic en **"Enable"** (Habilitar)

![Vision API Enable](https://cloud.google.com/vision/docs/images/enable-vision-api.png)

### 1.3 Verificar que está habilitada

1. Ve a **"APIs & Services" → "Enabled APIs & services"**
2. Deberías ver **"Cloud Vision API"** en la lista

---

## 💳 Paso 2: Configurar Facturación

Google Vision API requiere una cuenta de facturación, pero tiene capa gratuita.

### 2.1 Plan Gratuito

- **Primeras 1,000 imágenes/mes**: GRATIS
- **Después**: $1.50 USD por cada 1,000 imágenes

### 2.2 Configurar cuenta de facturación

1. En Google Cloud Console, ve a **"Billing"**
2. Sigue los pasos para agregar una tarjeta de crédito/débito
3. **Nota**: No te cobrarán hasta que superes las 1,000 imágenes gratuitas

---

## ⚙️ Paso 3: Instalar Dependencias de Firebase Functions

### 3.1 Navegar a carpeta de Functions

```bash
cd functions
```

### 3.2 Instalar dependencias

```bash
npm install
```

Esto instalará:
- `@google-cloud/vision` - Cliente de Vision API
- `firebase-admin` - SDK de Firebase Admin
- `firebase-functions` - Framework de Cloud Functions

---

## 🔑 Paso 4: Configurar Credenciales (Automático con Firebase)

**¡Buenas noticias!** Si usas Firebase Functions, la autenticación con Google Cloud es **automática**.

Firebase Functions ya tiene permisos para usar Vision API en el mismo proyecto.

**No necesitas**:
- ❌ Descargar archivos JSON de credenciales
- ❌ Configurar variables de entorno
- ❌ Service accounts adicionales

---

## 🏗️ Paso 5: Build y Deploy de Functions

### 5.1 Build del código TypeScript

Desde la carpeta `functions/`:

```bash
npm run build
```

### 5.2 Deploy de Functions

Desde la raíz del proyecto:

```bash
firebase deploy --only functions
```

Esto desplegará dos funciones:
1. **`validatePhotoOnUpload`** - Valida automáticamente cuando se sube una foto
2. **`manualPhotoReview`** - Permite a supervisores aprobar/rechazar manualmente

### 5.3 Verificar Deploy

Deberías ver algo como:

```
✔  functions[validatePhotoOnUpload(us-central1)] Successful deploy
✔  functions[manualPhotoReview(us-central1)] Successful deploy

Functions deployed successfully!
```

---

## 🧪 Paso 6: Probar la Validación

### 6.1 Probar con Emuladores (Desarrollo)

Para probar localmente sin gastar cuota:

```bash
# Terminal 1: Iniciar emuladores
firebase emulators:start

# Terminal 2: En otra terminal, hacer check-in de prueba
# La función se ejecutará en el emulador
```

### 6.2 Probar en Producción

1. Abre la app web
2. Haz un check-in y sube una foto
3. Ve a Firebase Console → Firestore
4. Busca el documento del check-in
5. Deberías ver el campo `photoValidation` con los resultados

Ejemplo de resultado:

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

## 📊 Paso 7: Monitorear Uso y Costos

### 7.1 Ver logs de Functions

```bash
firebase functions:log
```

O en Firebase Console: **Functions → Logs**

### 7.2 Monitorear uso de Vision API

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services → Dashboard**
3. Haz clic en **"Cloud Vision API"**
4. Ve a la pestaña **"Metrics"**

Aquí verás:
- Número de requests
- Cuántas son gratuitas vs pagadas
- Proyección de costos

### 7.3 Configurar alertas de presupuesto

1. En Google Cloud Console → **Billing → Budgets & alerts**
2. Crear alerta cuando gastes $5 USD, $10 USD, etc.

---

## ⚙️ Paso 8: Personalizar Validación

### 8.1 Ajustar umbrales de confianza

Edita `functions/src/photoValidation.ts`:

```typescript
const VALIDATION_CONFIG = {
  MIN_PERSON_CONFIDENCE: 0.7,     // Bajar si rechaza muchas fotos válidas
  MIN_UNIFORM_CONFIDENCE: 0.6,    // Ajustar según precisión
  MIN_LOGO_CONFIDENCE: 0.5,       // Muy bajo si no tienes logos claros
  AUTO_APPROVE_THRESHOLD: 0.85,   // Subir para ser más estricto
  AUTO_REJECT_THRESHOLD: 0.3,     // Bajar para enviar más a revisión manual
  // ...
};
```

### 8.2 Agregar logos de tu empresa

```typescript
EXPECTED_LOGOS: ['Aviva', 'BA', 'Construrama', 'TuLogo'],
```

### 8.3 Ajustar etiquetas de ubicación

```typescript
LOCATION_LABELS: ['Retail', 'Store', 'Tienda', 'Ferretería', 'Almacén'],
```

### 8.4 Re-deploy después de cambios

```bash
npm run build
firebase deploy --only functions
```

---

## 🐛 Troubleshooting

### Error: "Vision API is not enabled"

**Solución**: Asegúrate de habilitar Vision API en Google Cloud Console (Paso 1)

### Error: "Billing account not configured"

**Solución**: Agrega una cuenta de facturación en Google Cloud (Paso 2)

### La validación siempre devuelve "needs_review"

**Posibles causas**:
1. Umbrales muy altos → Bajar `VALIDATION_CONFIG`
2. Fotos de mala calidad → Pedir fotos más claras
3. No detecta uniforme → Ajustar `UNIFORM_LABELS`

### Functions no se despliegan

**Solución**:
```bash
# Verificar que estás autenticado
firebase login

# Verificar proyecto activo
firebase use --add

# Intentar de nuevo
firebase deploy --only functions
```

---

## 💰 Estimación de Costos

| Check-ins/mes | Imágenes | Costo Google Vision | Costo Total |
|---------------|----------|---------------------|-------------|
| 1,000         | 1,000    | **GRATIS**          | $0 USD      |
| 5,000         | 5,000    | $6 USD              | $6 USD      |
| 10,000        | 10,000   | $13.50 USD          | $13.50 USD  |
| 20,000        | 20,000   | $28.50 USD          | $28.50 USD  |

**Nota**: Estos son solo los costos de Vision API. Firebase Functions tiene su propia cuota gratuita (2M invocaciones/mes).

---

## 📚 Recursos Adicionales

- [Documentación Cloud Vision API](https://cloud.google.com/vision/docs)
- [Precios Cloud Vision](https://cloud.google.com/vision/pricing)
- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Vision API Features](https://cloud.google.com/vision/docs/features-list)

---

## ✅ Checklist de Configuración

- [ ] Google Cloud Vision API habilitada
- [ ] Cuenta de facturación configurada
- [ ] Dependencias de functions instaladas (`cd functions && npm install`)
- [ ] Functions desplegadas (`firebase deploy --only functions`)
- [ ] Prueba con foto real completada
- [ ] Umbrales de validación ajustados según tus necesidades
- [ ] Alertas de presupuesto configuradas

---

## 🎉 ¡Listo!

Ahora cada vez que un empleado suba una foto de check-in:
1. ✅ Se valida automáticamente con Vision API
2. ✅ Se aprueba/rechaza según los criterios configurados
3. ✅ Los supervisores solo revisan casos dudosos
4. ✅ Todo queda registrado en Firestore

¿Dudas? Revisa los logs con `firebase functions:log` o contacta soporte.
