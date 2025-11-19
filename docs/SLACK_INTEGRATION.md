# Integración de Slack - Sistema de Asistencia AVIVA

Documentación completa sobre cómo configurar y usar la integración con Slack para recibir notificaciones de asistencia en tiempo real.

## 📋 Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Crear un Webhook de Slack](#crear-un-webhook-de-slack)
3. [Configurar el Sistema](#configurar-el-sistema)
4. [Tipos de Notificaciones](#tipos-de-notificaciones)
5. [Probar la Integración](#probar-la-integración)
6. [Solución de Problemas](#solución-de-problemas)

---

## 🚀 Configuración Inicial

### Requisitos Previos

- Acceso de administrador al workspace de Slack
- Permisos de administrador en el Sistema de Asistencia AVIVA
- Un canal de Slack donde se enviarán las notificaciones (recomendado: `#asistencia`)

---

## 🔗 Crear un Webhook de Slack

### Paso 1: Crear una Aplicación de Slack

1. Ve a [https://api.slack.com/apps](https://api.slack.com/apps)
2. Haz clic en **"Create New App"**
3. Selecciona **"From scratch"**
4. Dale un nombre a tu app (ej: "Sistema de Asistencia AVIVA")
5. Selecciona tu workspace
6. Haz clic en **"Create App"**

### Paso 2: Habilitar Incoming Webhooks

1. En el menú lateral, ve a **"Incoming Webhooks"**
2. Activa el toggle de **"Activate Incoming Webhooks"**
3. Haz scroll hacia abajo y haz clic en **"Add New Webhook to Workspace"**
4. Selecciona el canal donde quieres recibir las notificaciones
5. Haz clic en **"Allow"**

### Paso 3: Copiar la URL del Webhook

1. Verás una URL que se ve así:
   ```
   https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
   ```
2. **Copia esta URL completa** (la necesitarás en el siguiente paso)

⚠️ **Importante:** Mantén esta URL segura, cualquiera con acceso a ella puede enviar mensajes a tu canal de Slack.

---

## ⚙️ Configurar el Sistema

### Paso 1: Acceder a Configuración

1. Inicia sesión como administrador en el Sistema de Asistencia AVIVA
2. Ve a **Panel de Administración** → **Configuración del Sistema**
3. Desplázate hasta la sección **"Integración con Slack"**

### Paso 2: Habilitar y Configurar

1. **Habilitar Slack:**
   - Activa el interruptor en la parte superior

2. **Webhook URL:**
   - Pega la URL del webhook que copiaste en el paso anterior
   - El sistema validará automáticamente el formato
   - Verás un ✓ verde si la URL es válida

3. **Canal por Defecto (Opcional):**
   - Puedes especificar un canal diferente (sin el #)
   - Si no lo especificas, se usará el canal configurado en el webhook
   - Ejemplo: `asistencia` o `alertas-rrhh`

4. **Eventos a Notificar:**
   - ✓ **Entradas con retraso:** Notifica cuando un empleado llega tarde
   - ✓ **Ausencias detectadas:** Notifica cuando se detecta una ausencia
   - ✓ **Comidas prolongadas:** Notifica cuando se excede el tiempo de comida

### Paso 3: Guardar Configuración

1. Revisa que todos los campos estén correctos
2. Haz clic en **"Guardar Configuración"**
3. Confirma que ves el mensaje de éxito

---

## 📢 Tipos de Notificaciones

El sistema envía notificaciones con diferentes niveles de severidad, identificados por colores:

### 🟢 Verde - A Tiempo
- Check-in realizado dentro del horario establecido
- Solo se envía si está habilitado en la configuración

### 🟠 Naranja - Retraso Leve (< 10 min)
- Retraso menor a 10 minutos
- Se considera leve y no crítico

### 🟡 Amarillo - Retraso Moderado (10-20 min)
- Retraso entre 10 y 20 minutos
- Requiere atención

### 🔴 Rojo - Retraso Severo (≥ 20 min)
- Retraso de 20 minutos o más
- Marcado como crítico y requiere acción inmediata

### Información Incluida en Cada Notificación

- 👤 **Usuario:** Nombre y email del empleado
- 📍 **Ubicación:** Kiosk donde se registró
- ⏰ **Hora:** Fecha y hora exacta del check-in
- 📊 **Estado:** Estado de puntualidad (a tiempo, retrasado, etc.)
- 👔 **Supervisor:** Nombre del supervisor asignado (si existe)
- 🏢 **Producto:** Tipo de producto/negocio (BA, Aviva Contigo, etc.)
- 📈 **Minutos Acumulados:** Total de minutos de retraso del empleado
- 💬 **Comentario:** Comentario del empleado (si lo proporcionó)

---

## 🧪 Probar la Integración

### Opción 1: Herramienta de Prueba (Recomendado para Validar URL)

⚠️ **Nota Importante:** La herramienta de prueba en el navegador puede fallar por restricciones CORS. Esto es normal y **NO significa que el webhook esté mal configurado**.

1. En la sección de configuración de Slack, busca **"Probar Conexión con Slack"**
2. Haz clic en **"Enviar Mensaje de Prueba a Slack"**
3. Si aparece un error CORS:
   - ✅ Es completamente normal
   - ✅ Tu webhook está correctamente configurado
   - ✅ Las notificaciones funcionarán perfectamente desde el servidor
4. Procede con la **Opción 2** para verificar que todo funciona

### Opción 2: Prueba Real con Check-in (Prueba Definitiva)

Esta es la manera más confiable de probar la integración:

1. **Guarda la configuración** de Slack
2. **Crea un usuario de prueba** (o usa tu propio usuario)
3. **Configura un horario de entrada** (ej: 9:00 AM)
4. **Realiza un check-in con retraso:**
   - Espera hasta las 9:15 AM
   - Registra la entrada desde el dispositivo móvil o kiosk
   - El sistema lo marcará como retrasado (15 minutos)
5. **Verifica en Slack:**
   - Ve a tu canal de Slack configurado
   - Deberías ver un mensaje con formato enriquecido
   - Incluirá el nombre del usuario, ubicación, minutos de retraso, etc.

### Pruebas Avanzadas

Puedes probar diferentes escenarios:

- ✅ **Entrada a tiempo:** Check-in dentro del horario → mensaje verde
- ⚠️ **Retraso leve:** 5-9 min de retraso → mensaje naranja
- ⚠️ **Retraso moderado:** 10-19 min de retraso → mensaje amarillo
- 🔴 **Retraso severo:** 20+ min de retraso → mensaje rojo

---

## 🔧 Solución de Problemas

### No Recibo Notificaciones en Slack

**1. Verifica la configuración:**
- ✓ ¿Está habilitado el interruptor de Slack?
- ✓ ¿La URL del webhook es correcta?
- ✓ ¿Está marcado el evento que quieres notificar?
- ✓ ¿Guardaste la configuración después de hacer cambios?

**2. Verifica el webhook en Slack:**
- Ve a [https://api.slack.com/apps](https://api.slack.com/apps)
- Selecciona tu aplicación
- Ve a "Incoming Webhooks"
- Verifica que el webhook esté activo (no revocado)

**3. Verifica el canal:**
- Asegúrate de estar mirando el canal correcto
- Si especificaste un canal personalizado, verifica que exista
- El bot debe tener permiso para publicar en ese canal

**4. Verifica los eventos:**
- Las notificaciones solo se envían cuando ocurre el evento configurado
- Ejemplo: Si solo activaste "Entradas con retraso", no recibirás notificaciones de ausencias

### El Mensaje de Prueba Falla con Error CORS

✅ **Esto es completamente normal y esperado.**

**¿Por qué?**
- Los webhooks de Slack tienen restricciones CORS que impiden peticiones desde el navegador
- Es una medida de seguridad de Slack

**¿Significa que algo está mal?**
- ❌ NO, tu configuración está correcta
- ✅ Las notificaciones funcionarán perfectamente desde el servidor
- ✅ Solo las pruebas desde el navegador fallan

**¿Cómo verificar que funciona?**
- Usa la **Opción 2: Prueba Real con Check-in** (ver sección anterior)
- Las notificaciones se envían desde el servidor de Firebase Functions
- No hay restricciones CORS en el servidor

### Las Notificaciones No Tienen el Formato Esperado

**Verifica la versión del sistema:**
- Las mejoras visuales requieren la versión más reciente
- Actualiza el código si es necesario

**Verifica que el usuario tenga todos los datos:**
- Email, supervisor, producto, etc.
- Algunos campos son opcionales y solo se muestran si existen

### El Webhook Dejó de Funcionar

**Posibles causas:**

1. **Webhook revocado:**
   - Ve a la configuración de tu app en Slack
   - Verifica que el webhook no haya sido eliminado
   - Si fue revocado, crea uno nuevo

2. **App desactivada:**
   - Verifica que la aplicación de Slack siga activa
   - Un administrador del workspace puede haberla desactivado

3. **Cambio de permisos:**
   - Verifica que la app tenga permisos para publicar en el canal

**Solución:**
- Crea un nuevo webhook siguiendo los pasos en "Crear un Webhook de Slack"
- Actualiza la URL en la configuración del sistema
- Guarda los cambios

---

## 📊 Mejores Prácticas

### 1. Canal Dedicado
- Crea un canal específico para notificaciones de asistencia
- Ejemplo: `#asistencia` o `#rrhh-alertas`
- Evita usar canales generales para no saturarlos

### 2. Notificaciones Selectivas
- No actives todas las notificaciones si no las necesitas
- Enfócate en eventos críticos (retrasos severos, ausencias)
- Puedes ajustar en cualquier momento

### 3. Configuración por Producto
- Puedes tener configuraciones diferentes para cada producto
- Ejemplo: BA con notificaciones en `#ba-asistencia`
- Aviva Contigo con notificaciones en `#aviva-asistencia`

### 4. Monitoreo
- Revisa periódicamente que las notificaciones lleguen correctamente
- Ten un proceso para cuando se detecten problemas
- Documenta quién es responsable de mantener la integración

### 5. Seguridad del Webhook
- No compartas la URL del webhook públicamente
- Si la URL se compromete, revoca el webhook y crea uno nuevo
- Solo personal autorizado debe tener acceso a la configuración

---

## 📞 Soporte

Si encuentras problemas que no están cubiertos en esta documentación:

1. Verifica los logs del sistema en Firebase Console
2. Revisa los errores en la consola del navegador (F12)
3. Contacta al equipo de desarrollo con:
   - Descripción del problema
   - Pasos para reproducirlo
   - Capturas de pantalla si es posible
   - Mensaje de error completo

---

## 🔄 Actualizaciones

**Última actualización:** 19 de Noviembre, 2025

**Versión:** 2.0

**Cambios recientes:**
- Mensajes enriquecidos con colores por severidad
- Información contextual adicional (supervisor, producto, acumulados)
- Herramienta de prueba integrada
- Validación automática de URLs
- Mejor manejo de errores CORS

---

## 📝 Notas Técnicas

### Arquitectura

```
Usuario realiza Check-in
  ↓
Sistema valida puntualidad
  ↓
Motor de Acciones (PunctualityActionEngine)
  ↓
Si aplica → Enviar notificación a Slack
  ↓
Webhook de Slack recibe mensaje
  ↓
Mensaje se publica en el canal configurado
```

### Tecnologías Utilizadas

- **Slack Incoming Webhooks:** Para recibir mensajes
- **Block Kit:** Para formato enriquecido de mensajes
- **Firebase Functions:** Para envío desde el servidor
- **TypeScript:** Para tipado estricto y validación

### Formato de Mensajes

El sistema utiliza Slack Block Kit para crear mensajes visualmente atractivos:
- **Header:** Título del mensaje con emoji
- **Section:** Campos informativos en formato de grid
- **Context:** Información adicional del sistema
- **Attachments:** Barra de color según severidad

---

¿Tienes sugerencias para mejorar esta documentación? ¡Contribuye al proyecto!
