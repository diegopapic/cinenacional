/**
 * Script de Migración OPTIMIZADO: Nombres Alternativos de Personas
 * Solo procesa los que NO han sido migrados aún
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const wpConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wordpress_cine',
  charset: 'utf8mb4'
};

function extractAlternativeNames(metaFields) {
  const alternativeNames = [];
  const count = parseInt(metaFields['nombre_alternativo'] || '0');
  
  if (count === 0) return alternativeNames;
  
  for (let i = 0; i < count; i++) {
    const firstName = metaFields[`nombre_alternativo_${i}_nombre_alternativo`] || null;
    const lastName = metaFields[`nombre_alternativo_${i}_apellido_alternativo`] || null;
    
    if (firstName || lastName) {
      alternativeNames.push({
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null
      });
    }
  }
  
  return alternativeNames;
}

async function getPostMeta(connection, postId) {
  const [rows] = await connection.execute(
    `SELECT meta_key, meta_value 
     FROM wp_postmeta 
     WHERE post_id = ?`,
    [postId]
  );
  
  const metaFields = {};
  rows.forEach(row => {
    metaFields[row.meta_key] = row.meta_value;
  });
  
  return metaFields;
}

async function migrateRemainingAlternativeNames() {
  let wpConnection;
  let stats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    alreadyMigrated: 0,
    details: []
  };
  
  try {
    console.log('🔌 Conectando a WordPress MySQL...');
    wpConnection = await mysql.createConnection(wpConfig);
    console.log('✅ Conectado a WordPress\n');
    
    console.log('🔌 Conectando a PostgreSQL...');
    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL\n');
    
    // Paso 1: Obtener IDs de personas que YA tienen nombres alternativos
    console.log('📊 Identificando personas ya migradas...');
    const alreadyMigratedPersons = await prisma.personAlternativeName.findMany({
      select: { personId: true },
      distinct: ['personId']
    });
    
    const migratedIds = new Set(alreadyMigratedPersons.map(p => p.personId));
    console.log(`✅ ${migratedIds.size} personas ya tienen nombres alternativos migrados\n`);
    stats.alreadyMigrated = migratedIds.size;
    
    // Paso 2: Obtener SOLO posts que NO están en el Set de migrados
    console.log('📋 Buscando posts pendientes de migración...');
    const [allPostsWithAltNames] = await wpConnection.execute(
      `SELECT DISTINCT post_id, meta_value as count
       FROM wp_postmeta
       WHERE meta_key = 'nombre_alternativo'
         AND meta_value != '0'
         AND meta_value != ''
         AND meta_value IS NOT NULL
       ORDER BY post_id`
    );
    
    // Filtrar solo los que NO están migrados
    const pendingPosts = allPostsWithAltNames.filter(
      post => !migratedIds.has(post.post_id)
    );
    
    console.log(`✅ Total de posts con nombres alternativos: ${allPostsWithAltNames.length}`);
    console.log(`✅ Posts ya migrados: ${allPostsWithAltNames.length - pendingPosts.length}`);
    console.log(`✅ Posts PENDIENTES de migrar: ${pendingPosts.length}\n`);
    
    stats.total = pendingPosts.length;
    
    if (pendingPosts.length === 0) {
      console.log('✨ ¡No hay posts pendientes! La migración está completa.');
      return stats;
    }
    
    // Paso 3: Procesar SOLO los pendientes
    let processed = 0;
    for (const post of pendingPosts) {
      const postId = post.post_id;
      const expectedCount = parseInt(post.count);
      processed++;
      
      try {
        console.log(`\n[${processed}/${pendingPosts.length}] 📝 Procesando post_id ${postId} (${expectedCount} nombres alternativos)...`);
        
        // Obtener meta fields
        const metaFields = await getPostMeta(wpConnection, postId);
        
        // Buscar persona en PostgreSQL
        const person = await prisma.person.findUnique({
          where: { id: postId }
        });
        
        if (!person) {
          console.log(`   ⚠️  No existe persona con id ${postId} - SALTADO`);
          stats.skipped++;
          stats.details.push({
            postId,
            status: 'skipped',
            reason: `Person id ${postId} not found`
          });
          continue;
        }
        
        console.log(`   👤 Persona encontrada: ${person.firstName} ${person.lastName} (id: ${person.id})`);
        
        // Extraer nombres alternativos
        const alternativeNames = extractAlternativeNames(metaFields);
        
        if (alternativeNames.length === 0) {
          console.log(`   ⚠️  No se pudieron extraer nombres alternativos - SALTADO`);
          stats.skipped++;
          stats.details.push({
            postId,
            personId: person.id,
            status: 'skipped',
            reason: 'No alternative names extracted'
          });
          continue;
        }
        
        console.log(`   📋 Nombres alternativos extraídos: ${alternativeNames.length}`);
        alternativeNames.forEach((name, index) => {
          console.log(`      ${index + 1}. ${name.firstName || ''} ${name.lastName || ''}`.trim());
        });
        
        // Insertar nombres alternativos
        let insertedCount = 0;
        for (const altName of alternativeNames) {
          await prisma.personAlternativeName.create({
            data: {
              personId: person.id,
              firstName: altName.firstName,
              lastName: altName.lastName
            }
          });
          insertedCount++;
        }
        
        console.log(`   ✅ Insertados ${insertedCount} nombres alternativos`);
        stats.migrated++;
        stats.details.push({
          postId,
          personId: person.id,
          personName: `${person.firstName} ${person.lastName}`,
          namesInserted: insertedCount,
          status: 'success'
        });
        
        // Mostrar progreso cada 50 registros
        if (processed % 50 === 0) {
          const percentage = ((processed / pendingPosts.length) * 100).toFixed(1);
          console.log(`\n⏳ Progreso: ${processed}/${pendingPosts.length} (${percentage}%)\n`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error procesando post_id ${postId}:`, error.message);
        stats.errors++;
        stats.details.push({
          postId,
          status: 'error',
          error: error.message
        });
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error general:', error);
    throw error;
  } finally {
    if (wpConnection) {
      await wpConnection.end();
      console.log('\n🔌 Desconectado de WordPress');
    }
    await prisma.$disconnect();
    console.log('🔌 Desconectado de PostgreSQL');
  }
  
  // Estadísticas finales
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMEN DE MIGRACIÓN (RESUME)');
  console.log('='.repeat(80));
  console.log(`Posts ya migrados (saltados):  ${stats.alreadyMigrated}`);
  console.log(`Posts pendientes procesados:   ${stats.total}`);
  console.log(`✅ Migrados exitosamente:       ${stats.migrated}`);
  console.log(`⚠️  Saltados:                    ${stats.skipped}`);
  console.log(`❌ Errores:                     ${stats.errors}`);
  console.log('='.repeat(80));
  
  const totalMigrated = stats.alreadyMigrated + stats.migrated;
  console.log(`\n✨ TOTAL DE PERSONAS CON NOMBRES ALTERNATIVOS: ${totalMigrated}`);
  
  // Guardar reporte
  const fs = require('fs');
  const reportPath = './migration-alternative-names-resume-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
  console.log(`\n📄 Reporte detallado guardado en: ${reportPath}`);
  
  return stats;
}

if (require.main === module) {
  migrateRemainingAlternativeNames()
    .then(stats => {
      console.log('\n✅ Migración de pendientes completada');
      process.exit(stats.errors > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { migrateRemainingAlternativeNames };