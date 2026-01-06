# Script de Diagnóstico de Firebase para Windows PowerShell

Write-Host ""
Write-Host "🔍 DIAGNÓSTICO DE CONFIGURACIÓN DE FIREBASE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar .firebaserc
Write-Host "1️⃣  Verificando archivo .firebaserc..." -ForegroundColor Yellow
if (Test-Path ".firebaserc") {
    Write-Host "✅ .firebaserc existe" -ForegroundColor Green
    Write-Host "   Contenido:" -ForegroundColor Gray
    Get-Content .firebaserc | Select-String "projects" -Context 0,2
} else {
    Write-Host "❌ .firebaserc NO existe" -ForegroundColor Red
    Write-Host "   Solución: Ejecuta 'firebase use --add'" -ForegroundColor Yellow
}
Write-Host ""

# 2. Verificar firebase.json
Write-Host "2️⃣  Verificando archivo firebase.json..." -ForegroundColor Yellow
if (Test-Path "firebase.json") {
    Write-Host "✅ firebase.json existe" -ForegroundColor Green
} else {
    Write-Host "❌ firebase.json NO existe" -ForegroundColor Red
}
Write-Host ""

# 3. Verificar credenciales de Google Cloud Vision
Write-Host "3️⃣  Verificando credenciales de Google Cloud Vision..." -ForegroundColor Yellow
if (Test-Path "functions/serviceAccountKey.json") {
    Write-Host "✅ functions/serviceAccountKey.json existe" -ForegroundColor Green
    $fileSize = (Get-Item "functions/serviceAccountKey.json").Length
    Write-Host "   Tamaño: $([math]::Round($fileSize/1KB, 2)) KB" -ForegroundColor Gray
} else {
    Write-Host "❌ functions/serviceAccountKey.json NO existe" -ForegroundColor Red
    Write-Host "   Solución: Coloca tu archivo JSON de credenciales en functions/" -ForegroundColor Yellow
}
Write-Host ""

# 4. Verificar dependencias de functions
Write-Host "4️⃣  Verificando dependencias de Cloud Functions..." -ForegroundColor Yellow
if (Test-Path "functions/node_modules") {
    Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "⚠️  Dependencias NO instaladas" -ForegroundColor Yellow
    Write-Host "   Solución: cd functions && npm install" -ForegroundColor Yellow
}
Write-Host ""

# 5. Verificar que Firebase CLI esté instalado
Write-Host "5️⃣  Verificando Firebase CLI..." -ForegroundColor Yellow
try {
    $firebaseVersion = firebase --version 2>$null
    if ($firebaseVersion) {
        Write-Host "✅ Firebase CLI instalado" -ForegroundColor Green
        Write-Host "   Versión: $firebaseVersion" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Firebase CLI NO instalado" -ForegroundColor Red
    Write-Host "   Solución: npm install -g firebase-tools" -ForegroundColor Yellow
}
Write-Host ""

# 6. Verificar proyecto activo
Write-Host "6️⃣  Verificando proyecto activo..." -ForegroundColor Yellow
try {
    $projects = firebase projects:list 2>$null
    if ($projects) {
        Write-Host "✅ Firebase CLI funcionando" -ForegroundColor Green
        Write-Host "   Ejecuta 'firebase projects:list' para ver tus proyectos" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  No se pudo conectar a Firebase" -ForegroundColor Yellow
    Write-Host "   Solución: firebase login" -ForegroundColor Yellow
}
Write-Host ""

# 7. Verificar .env (opcional)
Write-Host "7️⃣  Verificando variables de entorno..." -ForegroundColor Yellow
if ((Test-Path ".env.local") -or (Test-Path ".env")) {
    Write-Host "✅ Archivo .env encontrado" -ForegroundColor Green
} else {
    Write-Host "⚠️  No hay archivo .env" -ForegroundColor Yellow
    Write-Host "   Nota: Las variables deben estar configuradas para que la app funcione" -ForegroundColor Yellow
}
Write-Host ""

# Resumen
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "📋 RESUMEN Y PASOS SIGUIENTES:" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$needsSetup = $false

if (!(Test-Path ".firebaserc")) {
    Write-Host "1. " -NoNewline
    Write-Host "Configurar proyecto:" -ForegroundColor Yellow -NoNewline
    Write-Host " firebase use --add"
    $needsSetup = $true
}

if (!(Test-Path "functions/serviceAccountKey.json")) {
    Write-Host "2. " -NoNewline
    Write-Host "Colocar credenciales en:" -ForegroundColor Yellow -NoNewline
    Write-Host " functions/serviceAccountKey.json"
    $needsSetup = $true
}

if (!(Test-Path "functions/node_modules")) {
    Write-Host "3. " -NoNewline
    Write-Host "Instalar dependencias:" -ForegroundColor Yellow -NoNewline
    Write-Host " cd functions && npm install"
    $needsSetup = $true
}

Write-Host "4. " -NoNewline
Write-Host "Desplegar functions:" -ForegroundColor Yellow -NoNewline
Write-Host " firebase deploy --only functions"

Write-Host "5. " -NoNewline
Write-Host "Ver logs:" -ForegroundColor Yellow -NoNewline
Write-Host " firebase functions:log"

Write-Host ""
Write-Host "📖 Para más detalles, consulta: " -NoNewline
Write-Host "TROUBLESHOOTING_VALIDACIONES.md" -ForegroundColor Cyan
Write-Host ""

# Esperar antes de cerrar
Write-Host "Presiona Enter para cerrar..." -ForegroundColor Gray
Read-Host
