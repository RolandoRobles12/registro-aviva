// Script para asignar productType a usuarios basándose en su último check-in
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

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

interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  productType?: string;
}

interface CheckIn {
  userId: string;
  productType: string;
  timestamp: any;
}

async function assignProductTypes() {
  console.log('\n🔍 Iniciando asignación de productos a usuarios...\n');

  try {
    // 1. Obtener todos los usuarios
    const usersSnapshot = await db.collection('users').get();
    const users: User[] = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));

    console.log(`📊 Total de usuarios encontrados: ${users.length}`);

    // 2. Filtrar usuarios que necesitan asignación
    const usersNeedingProduct = users.filter(user =>
      user.status === 'active' && !user.productType
    );

    console.log(`⚠️  Usuarios activos sin producto: ${usersNeedingProduct.length}\n`);

    if (usersNeedingProduct.length === 0) {
      console.log('✅ Todos los usuarios activos ya tienen producto asignado');
      return;
    }

    let successCount = 0;
    let noCheckinsCount = 0;
    const results: { userId: string; userName: string; productType?: string; error?: string }[] = [];

    // 3. Para cada usuario, buscar su último check-in
    for (const user of usersNeedingProduct) {
      try {
        console.log(`🔎 Procesando: ${user.name} (${user.email})`);

        // Buscar el último check-in del usuario
        const checkInsSnapshot = await db.collection('checkins')
          .where('userId', '==', user.id)
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();

        if (checkInsSnapshot.empty) {
          console.log(`   ⚠️  No se encontraron check-ins para este usuario`);
          noCheckinsCount++;
          results.push({
            userId: user.id,
            userName: user.name,
            error: 'Sin check-ins'
          });
          continue;
        }

        const lastCheckIn = checkInsSnapshot.docs[0].data() as CheckIn;
        const productType = lastCheckIn.productType;

        if (!productType) {
          console.log(`   ⚠️  El check-in no tiene productType`);
          results.push({
            userId: user.id,
            userName: user.name,
            error: 'Check-in sin productType'
          });
          continue;
        }

        // Actualizar el usuario con el productType
        await db.collection('users').doc(user.id).update({
          productType,
          updatedAt: new Date()
        });

        console.log(`   ✅ Asignado producto: ${productType}`);
        successCount++;
        results.push({
          userId: user.id,
          userName: user.name,
          productType
        });

      } catch (error) {
        console.error(`   ❌ Error procesando usuario ${user.name}:`, error);
        results.push({
          userId: user.id,
          userName: user.name,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // 4. Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE ASIGNACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Usuarios actualizados exitosamente: ${successCount}`);
    console.log(`⚠️  Usuarios sin check-ins: ${noCheckinsCount}`);
    console.log(`❌ Usuarios con errores: ${results.filter(r => r.error && r.error !== 'Sin check-ins').length}`);
    console.log('='.repeat(60));

    // 5. Mostrar detalles
    console.log('\n📋 DETALLES POR USUARIO:\n');

    const byProduct: Record<string, string[]> = {};

    results.forEach(result => {
      if (result.productType) {
        if (!byProduct[result.productType]) {
          byProduct[result.productType] = [];
        }
        byProduct[result.productType].push(result.userName);
      }
    });

    Object.entries(byProduct).forEach(([product, userNames]) => {
      console.log(`\n${product}:`);
      userNames.forEach(name => console.log(`  • ${name}`));
    });

    const usersWithErrors = results.filter(r => r.error);
    if (usersWithErrors.length > 0) {
      console.log('\n⚠️  USUARIOS CON PROBLEMAS:\n');
      usersWithErrors.forEach(result => {
        console.log(`  • ${result.userName}: ${result.error}`);
      });
    }

    console.log('\n✅ Proceso completado\n');

  } catch (error) {
    console.error('❌ Error ejecutando el script:', error);
    throw error;
  }
}

// Ejecutar el script
assignProductTypes()
  .then(() => {
    console.log('🎉 Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
