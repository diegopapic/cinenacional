/**
 * Script para migrar el campo "stage" (estado de producción) 
 * desde WordPress a Supabase/PostgreSQL
 * 
 * Migra el campo wp_postmeta.meta_key = 'estado' 
 * al campo movies.stage en PostgreSQL
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuración MySQL (WordPress)
const mysqlConfig = {
  host: process.env.WP_DB_HOST || 'localhost',
  user: process.env.WP_DB_USER || 'root',
  password: process.env.WP_DB_PASSWORD || '',
  database: process.env.WP_DB_NAME || 'wordpress_cine',
  port: process.env.WP_DB_PORT || 3306
};

/**
 * Mapeo de valores de WordPress a enum MovieStage de Prisma
 */
const STAGE_MAPPING = {
  'Completa': 'COMPLETA',
  'En desarrollo': 'EN_DESARROLLO',
  'En postproducción': 'EN_POSTPRODUCCION',
  'En preproducción': 'EN_PREPRODUCCION',
  'En producción': 'EN_PRODUCCION',
  'En rodaje': 'EN_RODAJE',
  'Inconclusa': 'INCONCLUSA',
  'Inédita': 'INEDITA'
};

/**
 * Obtiene los valores de stage desde WordPress
 */
async function getStagesFromWordPress(connection) {
  console.log('📊 Obteniendo stages desde WordPress...\n');
  
  const [stages] = await connection.execute(`
    SELECT 
      p.ID as wp_id,
      p.post_title,
      pm.meta_value as stage_wp
    FROM wp_posts p
    INNER JOIN wp_postmeta pm ON p.ID = pm.post_id
    WHERE p.post_type = 'pelicula'
      AND p.post_status = 'publish'
      AND pm.meta_key = 'estado'
      AND pm.meta_value IS NOT NULL
      AND pm.meta_value != ''
    ORDER BY p.ID
  `);
  
  console.log(`   ✅ ${stages.length} películas con stage encontradas\n`);
  
  // Estadísticas de valores
  const stats = {};
  stages.forEach(movie => {
    stats[movie.stage_wp] = (stats[movie.stage_wp] || 0) + 1;
  });
  
  console.log('📈 Distribución de stages:');
  Object.entries(stats).forEach(([stage, count]) => {
    const mapped = STAGE_MAPPING[stage] || '❌ SIN MAPEO';
    console.log(`   - "${stage}": ${count} películas → ${mapped}`);
  });
  console.log('');
  
  return stages;
}

/**
 * Migra los stages a Supabase
 */
async function migrateStages(stages) {
  console.log('🚀 Iniciando migración de stages...\n');
  
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let unmapped = 0;
  const unmappedValues = new Set();
  
  for (const movie of stages) {
    try {
      const { wp_id, post_title, stage_wp } = movie;
      
      // Mapear el valor de WordPress al enum de Prisma
      const stagePrisma = STAGE_MAPPING[stage_wp];
      
      if (!stagePrisma) {
        console.log(`   ⚠️  Sin mapeo: "${stage_wp}" en película ${wp_id} - ${post_title}`);
        unmappedValues.add(stage_wp);
        unmapped++;
        continue;
      }
      
      // Buscar la película en Supabase por wp_id
      const existingMovie = await prisma.movie.findFirst({
        where: { 
          OR: [
            { id: wp_id },
            { title: post_title }
          ]
        }
      });
      
      if (!existingMovie) {
        skipped++;
        continue;
      }
      
      // Actualizar el stage
      await prisma.movie.update({
        where: { id: existingMovie.id },
        data: { stage: stagePrisma }
      });
      
      updated++;
      
      // Log cada 100 películas
      if (updated % 100 === 0) {
        console.log(`   ✅ ${updated} películas actualizadas...`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error en película ${movie.wp_id}: ${error.message}`);
      errors++;
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  RESUMEN DE MIGRACIÓN');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`✅ Películas actualizadas: ${updated}`);
  console.log(`⏭️  Películas saltadas (no encontradas): ${skipped}`);
  console.log(`⚠️  Valores sin mapeo: ${unmapped}`);
  console.log(`❌ Errores: ${errors}`);
  console.log(`📊 Total procesadas: ${stages.length}\n`);
  
  if (unmappedValues.size > 0) {
    console.log('⚠️  VALORES SIN MAPEO ENCONTRADOS:');
    unmappedValues.forEach(value => {
      console.log(`   - "${value}"`);
    });
    console.log('\n   Estos valores necesitan ser agregados a STAGE_MAPPING\n');
  }
}

/**
 * Verifica los stages migrados
 */
async function verifyMigration() {
  console.log('🔍 Verificando migración...\n');
  
  try {
    const stats = await prisma.movie.groupBy({
      by: ['stage'],
      _count: true
    });
    
    console.log('📊 Distribución de stages en Supabase:');
    
    // Ordenar por count descendente
    const sortedStats = stats.sort((a, b) => b._count - a._count);
    
    sortedStats.forEach(stat => {
      console.log(`   - ${stat.stage || 'NULL'}: ${stat._count} películas`);
    });
    
    // Películas sin stage
    const withoutStage = await prisma.movie.count({
      where: { stage: null }
    });
    
    console.log(`\n   ⚠️  Películas sin stage: ${withoutStage}`);
    console.log('');
    
  } catch (error) {
    console.log('⚠️  No se pudieron obtener las estadísticas (esto no afecta la migración)');
    console.log(`   Error: ${error.message}\n`);
    
    // Verificación alternativa: contar total de películas con stage
    try {
      const totalWithStage = await prisma.movie.count({
        where: { stage: { not: null } }
      });
      console.log(`✅ Total de películas con stage asignado: ${totalWithStage}\n`);
    } catch (altError) {
      console.log('   No se pudo verificar el total\n');
    }
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  MIGRACIÓN DE CAMPO STAGE - WORDPRESS → SUPABASE');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  let mysqlConnection;
  
  try {
    // Conectar a MySQL
    console.log('🔌 Conectando a MySQL (WordPress)...');
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('   ✅ Conexión MySQL exitosa\n');
    
    // Conectar a Supabase
    console.log('🔌 Conectando a Supabase (PostgreSQL)...');
    await prisma.$connect();
    console.log('   ✅ Conexión Supabase exitosa\n');
    
    // Obtener stages desde WordPress
    const stages = await getStagesFromWordPress(mysqlConnection);
    
    // Confirmar antes de migrar
    console.log('⚠️  ¿Continuar con la migración? (Ctrl+C para cancelar)');
    console.log('   Presiona Enter para continuar...\n');
    
    // En producción, descomentar esta línea para pedir confirmación:
    // await new Promise(resolve => process.stdin.once('data', resolve));
    
    // Migrar stages
    await migrateStages(stages);
    
    // Verificar migración
    await verifyMigration();
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ✅ MIGRACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error);
    throw error;
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
      console.log('🔌 Conexión MySQL cerrada');
    }
    await prisma.$disconnect();
    console.log('🔌 Conexión Supabase cerrada\n');
  }
}

// Ejecutar
main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});