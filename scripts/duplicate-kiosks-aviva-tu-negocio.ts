// Script para duplicar kioscos de Aviva Contigo como Aviva Tu Negocio
// Uso: npx tsx scripts/duplicate-kiosks-aviva-tu-negocio.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '..', 'service-account-key.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: No se encontró el archivo de credenciales de servicio');
  console.error(`   Busqué en: ${serviceAccountPath}`);
  console.error('   Asegúrate de tener el archivo service-account-key.json en la raíz del proyecto');
  console.error('   O define la variable de entorno GOOGLE_APPLICATION_CREDENTIALS');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

interface KioskData {
  id: string;
  name: string;
  city: string;
  state: string;
  productType: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  radiusOverride?: number;
  status: string;
  hubId?: string;
}

async function duplicateKiosks() {
  console.log('\n🔄 Iniciando duplicación de kioscos Aviva Contigo → Aviva Tu Negocio...\n');

  try {
    // 1. Obtener todos los kioscos
    const allKiosksSnapshot = await db.collection('kiosks').get();
    const allKiosks = allKiosksSnapshot.docs.map(doc => ({
      docId: doc.id,
      ...doc.data()
    })) as (KioskData & { docId: string })[];

    console.log(`📊 Total de kioscos en la base de datos: ${allKiosks.length}`);

    // 2. Filtrar kioscos de Aviva Contigo
    const avivaContigoKiosks = allKiosks.filter(k => k.productType === 'Aviva_Contigo');
    console.log(`🏪 Kioscos de Aviva Contigo encontrados: ${avivaContigoKiosks.length}`);

    if (avivaContigoKiosks.length === 0) {
      console.log('⚠️  No hay kioscos de Aviva Contigo para duplicar');
      return;
    }

    // 3. Verificar si ya existen kioscos de Aviva Tu Negocio
    const existingTuNegocio = allKiosks.filter(k => k.productType === 'Aviva_Tu_Negocio');
    if (existingTuNegocio.length > 0) {
      console.log(`⚠️  Ya existen ${existingTuNegocio.length} kioscos de Aviva Tu Negocio`);
      console.log('   Si deseas volver a duplicar, primero elimina los existentes.');
      return;
    }

    // 4. Encontrar el ID máximo existente para generar nuevos IDs
    const allIds = allKiosks
      .map(k => parseInt(k.id, 10))
      .filter(id => !isNaN(id));
    let nextId = Math.max(...allIds, 0) + 1;

    console.log(`\n🔢 Próximo ID disponible: ${nextId.toString().padStart(4, '0')}`);
    console.log(`\n📋 Kioscos a crear:\n`);

    // 5. Crear los nuevos kioscos en lotes
    const BATCH_SIZE = 400; // Firestore limit es 500 por batch
    let successCount = 0;
    let errorCount = 0;
    let batch = db.batch();
    let batchCount = 0;

    for (const kiosk of avivaContigoKiosks) {
      try {
        const newId = nextId.toString().padStart(4, '0');
        nextId++;

        const newKiosk = {
          id: newId,
          name: kiosk.name,
          city: kiosk.city,
          state: kiosk.state,
          productType: 'Aviva_Tu_Negocio',
          coordinates: {
            latitude: kiosk.coordinates.latitude,
            longitude: kiosk.coordinates.longitude,
          },
          status: kiosk.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Incluir radiusOverride solo si existe
        if (kiosk.radiusOverride) {
          (newKiosk as any).radiusOverride = kiosk.radiusOverride;
        }

        const docRef = db.collection('kiosks').doc();
        batch.set(docRef, newKiosk);
        batchCount++;

        console.log(`   ✅ ${kiosk.id} (${kiosk.name}) → ${newId} (Aviva Tu Negocio)`);

        // Commit batch si alcanzamos el límite
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`\n   📦 Lote de ${batchCount} kioscos guardado`);
          batch = db.batch();
          batchCount = 0;
        }

        successCount++;
      } catch (error) {
        console.error(`   ❌ Error duplicando kiosko ${kiosk.id} (${kiosk.name}):`, error);
        errorCount++;
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`\n   📦 Último lote de ${batchCount} kioscos guardado`);
    }

    // 6. Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE DUPLICACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Kioscos creados exitosamente: ${successCount}`);
    console.log(`❌ Kioscos con errores: ${errorCount}`);
    console.log(`🏪 Producto origen: Aviva Contigo`);
    console.log(`🏪 Producto destino: Aviva Tu Negocio`);
    console.log('='.repeat(60));
    console.log('\n✅ Los kioscos de Aviva Tu Negocio ahora aparecerán en el dropdown\n');

  } catch (error) {
    console.error('❌ Error ejecutando el script:', error);
    throw error;
  }
}

// Ejecutar el script
duplicateKiosks()
  .then(() => {
    console.log('🎉 Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
