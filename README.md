# registro-aviva

Sistema de control de asistencia y check-in para empleados de Aviva Crédito. Valida fotos de check-in con Google Cloud Vision API y expone un dashboard de administración, portal de supervisores y portal de empleados con RBAC.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript 5 + Vite 4 |
| Estilos | Tailwind CSS 3 + Headless UI |
| Routing | React Router DOM v6 |
| Formularios | React Hook Form + Zod |
| Backend / BaaS | Firebase (Auth, Firestore, Storage, Hosting) |
| Cloud Functions | Node 18 + TypeScript (Firebase Functions v5) |
| Validación de fotos | Google Cloud Vision API v4 |
| Exportes | jsPDF + jspdf-autotable, xlsx, papaparse |
| Lint | ESLint + typescript-eslint |

## Estructura del proyecto

```
registro-aviva/
├── src/
│   ├── components/
│   │   ├── admin/          # ~29 componentes del panel admin
│   │   ├── employee/       # Portal empleado
│   │   ├── supervisor/     # Portal supervisor
│   │   ├── auth/           # Guards de ruta por rol
│   │   ├── common/         # Componentes compartidos
│   │   ├── forms/          # Formularios reutilizables
│   │   ├── layout/         # Shell / layouts
│   │   └── ui/             # Primitivos UI (botones, modales, etc.)
│   ├── pages/
│   │   ├── admin/          # 12 páginas admin
│   │   ├── employee/       # 3 páginas empleado
│   │   ├── supervisor/
│   │   └── auth/
│   ├── services/           # Capa de acceso a datos / lógica de negocio
│   │   ├── attendance.ts
│   │   ├── auth.ts
│   │   ├── firestore.ts
│   │   ├── hubs.ts
│   │   ├── jobs.ts
│   │   ├── products.ts
│   │   ├── schedules.ts
│   │   ├── storage.ts
│   │   ├── photoValidationService.ts
│   │   ├── exportService.ts
│   │   ├── reportsService.ts
│   │   ├── gmailService.ts
│   │   ├── slackWebhookTester.ts
│   │   ├── userMigration.ts
│   │   ├── punctualityActionEngine.ts
│   │   └── hubReportService.ts
│   ├── contexts/
│   │   └── AuthContext.tsx  # Auth state + RBAC
│   ├── hooks/
│   ├── config/
│   │   └── firebase.ts      # Inicialización Firebase SDK
│   ├── types/
│   │   └── index.ts         # Tipos globales del dominio
│   └── utils/
│       ├── formatters.ts
│       ├── validators.ts
│       └── geolocation.ts
├── functions/
│   └── src/
│       ├── index.ts              # Entry point Cloud Functions
│       └── photoValidation.ts    # Lógica de validación con Vision API
├── scripts/
│   ├── assign-product-types.ts
│   └── duplicate-kiosks-aviva-tu-negocio.ts
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
└── firebase.json
```

## Requisitos

- Node.js >= 18, npm >= 9
- Firebase CLI: `npm install -g firebase-tools`
- Acceso al proyecto Firebase de Aviva (`registro-aviva` o alias configurado)
- Google Cloud Vision API habilitada en el mismo proyecto GCP

## Setup local

```bash
# 1. Instalar dependencias del frontend
npm install

# 2. Instalar dependencias de Cloud Functions
cd functions && npm install && cd ..

# 3. Configurar proyecto Firebase (genera .firebaserc)
firebase login
firebase use --add   # alias: default

# 4. Credenciales de Vision API (solo para ejecutar functions localmente)
# Copiar service account key al directorio de functions
cp /ruta/a/serviceAccountKey.json functions/serviceAccountKey.json

# 5. Levantar emuladores (Auth :9099, Firestore :8080, Storage :9199, UI :4000)
npm run firebase:emulators

# 6. Levantar dev server (en otra terminal)
npm run dev   # http://localhost:5173
```

## Scripts disponibles

```bash
npm run dev                          # Dev server con HMR (Vite)
npm run build                        # Build de producción → dist/
npm run preview                      # Sirve el build local
npm run lint                         # ESLint (0 warnings tolerados)
npm run type-check                   # tsc --noEmit
npm run deploy                       # build + firebase deploy (hosting + functions)
npm run deploy:hosting               # build + firebase deploy --only hosting
npm run firebase:emulators           # Firebase Local Emulator Suite

# Scripts de migración / data
npm run assign-products              # tsx scripts/assign-product-types.ts
npm run duplicate-kiosks-tu-negocio  # tsx scripts/duplicate-kiosks-aviva-tu-negocio.ts
```

## Cloud Functions

Dos funciones desplegadas en `us-central1`:

| Función | Trigger | Descripción |
|---|---|---|
| `validatePhotoOnUpload` | Storage `onFinalize` | Se dispara cuando se sube un archivo bajo `attendance-photos/**`. Llama a Vision API y escribe `photoValidation` en el documento de Firestore correspondiente. |
| `manualPhotoReview` | HTTPS Callable | Permite a supervisores aprobar o rechazar manualmente un check-in. |

### Lógica de scoring (photoValidation.ts)

La confianza final es una suma ponderada:

| Factor | Peso |
|---|---|
| Persona detectada | 40% |
| Color verde de uniforme | 30% |
| Ropa/uniforme detectado | 15% |
| Ambiente / ubicación (retail/tienda) | 10% |
| Logo corporativo | 5% |

| Score final | Estado resultante |
|---|---|
| ≥ 0.70 | `auto_approved` |
| 0.51 – 0.69 | `needs_review` |
| ≤ 0.50 | `rejected` |

Los umbrales y pesos se configuran en `VALIDATION_CONFIG` dentro de `functions/src/photoValidation.ts`.

## Deploy

```bash
# Deploy completo (hosting + functions)
npm run deploy

# Solo hosting
npm run deploy:hosting

# Solo functions (útil durante desarrollo de backend)
firebase deploy --only functions
```

`firebase.json` configura:
- **Hosting**: SPA con rewrite `** → /index.html`, cache immutable en `/static/**`
- **Functions**: predeploy `tsc` automático
- **Emulators**: Auth 9099, Firestore 8080, Storage 9199, UI 4000

## Firestore

Las reglas de acceso están en `firestore.rules`. Los índices compuestos necesarios para queries de reportes están en `firestore.indexes.json` — despliega con `firebase deploy --only firestore`.

## Variables de entorno / Configuración

El frontend usa la configuración de Firebase exportada desde `src/config/firebase.ts`. No hay `.env` requerido para el frontend en desarrollo (la config se hardcodea para el proyecto de staging/dev).

Para las Cloud Functions, ver [GOOGLE_CLOUD_CREDENTIALS.md](GOOGLE_CLOUD_CREDENTIALS.md).

## Documentación adicional

- [GOOGLE_VISION_SETUP.md](GOOGLE_VISION_SETUP.md) — Habilitación de Vision API y configuración de billing
- [GOOGLE_CLOUD_CREDENTIALS.md](GOOGLE_CLOUD_CREDENTIALS.md) — Opciones de autenticación del Service Account
- [INICIO_RAPIDO.md](INICIO_RAPIDO.md) — Deploy rápido de Cloud Functions
- [TROUBLESHOOTING_VALIDACIONES.md](TROUBLESHOOTING_VALIDACIONES.md) — Diagnóstico de validaciones
