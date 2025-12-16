#!/bin/bash

echo "🔍 DIAGNÓSTICO DE CONFIGURACIÓN DE FIREBASE"
echo "============================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar .firebaserc
echo "1️⃣  Verificando archivo .firebaserc..."
if [ -f ".firebaserc" ]; then
    echo -e "${GREEN}✅ .firebaserc existe${NC}"
    echo "   Contenido:"
    cat .firebaserc | grep -A 2 "projects"
else
    echo -e "${RED}❌ .firebaserc NO existe${NC}"
    echo -e "${YELLOW}   Solución: Ejecuta 'firebase use --add'${NC}"
fi
echo ""

# 2. Verificar firebase.json
echo "2️⃣  Verificando archivo firebase.json..."
if [ -f "firebase.json" ]; then
    echo -e "${GREEN}✅ firebase.json existe${NC}"
else
    echo -e "${RED}❌ firebase.json NO existe${NC}"
fi
echo ""

# 3. Verificar credenciales de Google Cloud Vision
echo "3️⃣  Verificando credenciales de Google Cloud Vision..."
if [ -f "functions/serviceAccountKey.json" ]; then
    echo -e "${GREEN}✅ functions/serviceAccountKey.json existe${NC}"
    echo "   Tamaño: $(du -h functions/serviceAccountKey.json | cut -f1)"
else
    echo -e "${RED}❌ functions/serviceAccountKey.json NO existe${NC}"
    echo -e "${YELLOW}   Solución: Coloca tu archivo JSON de credenciales en functions/${NC}"
fi
echo ""

# 4. Verificar dependencias de functions
echo "4️⃣  Verificando dependencias de Cloud Functions..."
if [ -d "functions/node_modules" ]; then
    echo -e "${GREEN}✅ Dependencias instaladas${NC}"
else
    echo -e "${YELLOW}⚠️  Dependencias NO instaladas${NC}"
    echo -e "${YELLOW}   Solución: cd functions && npm install${NC}"
fi
echo ""

# 5. Verificar que Firebase CLI esté instalado
echo "5️⃣  Verificando Firebase CLI..."
if command -v firebase &> /dev/null; then
    echo -e "${GREEN}✅ Firebase CLI instalado${NC}"
    firebase --version
else
    echo -e "${RED}❌ Firebase CLI NO instalado${NC}"
    echo -e "${YELLOW}   Solución: npm install -g firebase-tools${NC}"
fi
echo ""

# 6. Verificar proyecto activo
echo "6️⃣  Verificando proyecto activo..."
if command -v firebase &> /dev/null; then
    PROJECT=$(firebase projects:list 2>&1 | grep "│" | head -1)
    if [ ! -z "$PROJECT" ]; then
        echo -e "${GREEN}✅ Proyectos disponibles:${NC}"
        firebase projects:list 2>&1 | grep -E "(Project Display Name|│.*│)"
    else
        echo -e "${YELLOW}⚠️  No se pudo listar proyectos${NC}"
        echo -e "${YELLOW}   Solución: firebase login${NC}"
    fi
else
    echo -e "${RED}❌ No se puede verificar (Firebase CLI no instalado)${NC}"
fi
echo ""

# 7. Verificar .env (opcional)
echo "7️⃣  Verificando variables de entorno..."
if [ -f ".env.local" ] || [ -f ".env" ]; then
    echo -e "${GREEN}✅ Archivo .env encontrado${NC}"
else
    echo -e "${YELLOW}⚠️  No hay archivo .env${NC}"
    echo -e "${YELLOW}   Nota: Las variables deben estar configuradas para que la app funcione${NC}"
fi
echo ""

# Resumen
echo "============================================"
echo "📋 RESUMEN:"
echo "============================================"
echo ""
echo "Pasos siguientes recomendados:"
echo ""

if [ ! -f ".firebaserc" ]; then
    echo "1. ${YELLOW}Configurar proyecto: firebase use --add${NC}"
fi

if [ ! -f "functions/serviceAccountKey.json" ]; then
    echo "2. ${YELLOW}Colocar credenciales en: functions/serviceAccountKey.json${NC}"
fi

if [ ! -d "functions/node_modules" ]; then
    echo "3. ${YELLOW}Instalar dependencias: cd functions && npm install${NC}"
fi

echo "4. ${YELLOW}Desplegar functions: firebase deploy --only functions${NC}"
echo "5. ${YELLOW}Ver logs: firebase functions:log${NC}"
echo ""
echo "Para más detalles, consulta: TROUBLESHOOTING_VALIDACIONES.md"
echo ""
