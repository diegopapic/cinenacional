/**
 * Script de Migración: Nombres Alternativos de Personas
 * WordPress (MySQL) -> PostgreSQL (Supabase)
 * 
 * Migra nombres alternativos almacenados en ACF (Advanced Custom Fields)
 * desde wp_postmeta a la tabla person_alternative_names
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuración de conexión a WordPress MySQL
const wpConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Ajusta si tienes password
  database: 'wordpress_cine',
  charset: 'utf8mb4'
};

/**
 * Extrae nombres alternativos de un post usando el patrón ACF
 * @param {Object} metaFields - Objeto con todos los meta_key/meta_value del post
 * @returns {Array} Array de objetos {firstName, lastName}
 */
function extractAlternativeNames(metaFields) {
  const alternativeNames = [];
  
  // Obtener el número de nombres alternativos
  const count = parseInt(metaFields['nombre_alternativo'] || '0');
  
  if (count === 0) return alternativeNames;
  
  // Extraer cada nombre alternativo
  for (let i = 0; i < count; i++) {
    const firstName = metaFields[`nombre_alternativo_${i}_nombre_alternativo`] || null;
    const lastName = metaFields[`nombre_alternativo_${i}_apellido_alternativo`] || null;
    
    // Solo agregar si al menos uno de los campos tiene valor
    if (firstName || lastName) {
      alternativeNames.push({
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null
      });
    }
  }
  
  return alternativeNames;
}

/**
 * Obtiene todos los meta fields de un post
 * @param {Object} connection - Conexión MySQL
 * @param {number} postId - ID del post
 * @returns {Object} Objeto con meta_key como clave y meta_value como valor
 */
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

/**
 * Función principal de migración
 */
async function migrateAlternativeNames() {
  let wpConnection;
  let stats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    details: []
  };
  
  try {
    console.log('🔌 Conectando a WordPress MySQL...');
    wpConnection = await mysql.createConnection(wpConfig);
    console.log('✅ Conectado a WordPress\n');
    
    console.log('🔌 Conectando a PostgreSQL...');
    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL\n');
    
    // Paso 1: Obtener todos los posts con nombres alternativos
    console.log('📋 Buscando posts con nombres alternativos...');
    const [postsWithAltNames] = await wpConnection.execute(
      `SELECT DISTINCT post_id, meta_value as count
       FROM wp_postmeta
       WHERE meta_key = 'nombre_alternativo'
         AND meta_value != '0'
         AND meta_value != ''
         AND meta_value IS NOT NULL
       ORDER BY post_id`
    );
    
    console.log(`✅ Encontrados ${postsWithAltNames.length} posts con nombres alternativos\n`);
    stats.total = postsWithAltNames.length;
    
    // Paso 2: Procesar cada post
    for (const post of postsWithAltNames) {
      const postId = post.post_id;
      const expectedCount = parseInt(post.count);
      
      try {
        console.log(`\n📝 Procesando post_id ${postId} (${expectedCount} nombres alternativos)...`);
        
        // Obtener todos los meta fields del post
        const metaFields = await getPostMeta(wpConnection, postId);
        
        // Buscar la persona en PostgreSQL usando el post_id de WordPress
        // (que se mantiene como id en la tabla people)
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
        
        // Verificar si ya existen nombres alternativos para esta persona
        const existingNames = await prisma.personAlternativeName.findMany({
          where: { personId: person.id }
        });
        
        if (existingNames.length > 0) {
          console.log(`   ⚠️  Ya tiene ${existingNames.length} nombres alternativos - SALTADO`);
          stats.skipped++;
          stats.details.push({
            postId,
            personId: person.id,
            status: 'skipped',
            reason: 'Already has alternative names'
          });
          continue;
        }
        
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
    // Cerrar conexiones
    if (wpConnection) {
      await wpConnection.end();
      console.log('\n🔌 Desconectado de WordPress');
    }
    await prisma.$disconnect();
    console.log('🔌 Desconectado de PostgreSQL');
  }
  
  // Mostrar estadísticas finales
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMEN DE MIGRACIÓN');
  console.log('='.repeat(80));
  console.log(`Total de posts procesados:     ${stats.total}`);
  console.log(`✅ Migrados exitosamente:       ${stats.migrated}`);
  console.log(`⚠️  Saltados:                    ${stats.skipped}`);
  console.log(`❌ Errores:                     ${stats.errors}`);
  console.log('='.repeat(80));
  
  // Guardar reporte detallado en JSON
  const fs = require('fs');
  const reportPath = './migration-alternative-names-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
  console.log(`\n📄 Reporte detallado guardado en: ${reportPath}`);
  
  return stats;
}

// Ejecutar migración
if (require.main === module) {
  migrateAlternativeNames()
    .then(stats => {
      console.log('\n✅ Migración completada');
      process.exit(stats.errors > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { migrateAlternativeNames };