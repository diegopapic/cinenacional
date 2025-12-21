const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configuración PostgreSQL - VPS
// Para ejecutar localmente con túnel SSH:
// ssh -L 5433:localhost:5433 usuario@5.161.58.106
const pgConfig = {
  host: 'localhost',
  port: 5433,
  database: 'cinenacional',
  user: 'cinenacional',
  password: 'Paganitzu'
};

async function fixPeopleNames() {
  const client = new Client(pgConfig);
  
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // 1. Primero, analizar cuántos registros serán afectados
    console.log('📊 Analizando registros a modificar...\n');
    
    const analysisQuery = `
      SELECT 
        id, 
        first_name, 
        last_name, 
        slug
      FROM people 
      WHERE first_name IS NOT NULL 
        AND first_name != '' 
        AND (last_name IS NULL OR last_name = '')
      ORDER BY id
    `;
    
    const analysisResult = await client.query(analysisQuery);
    const recordsToFix = analysisResult.rows;
    
    console.log(`📋 Registros encontrados: ${recordsToFix.length}\n`);
    
    if (recordsToFix.length === 0) {
      console.log('✅ No hay registros que necesiten corrección.');
      return;
    }
    
    // Mostrar primeros 10 ejemplos
    console.log('📝 Primeros 10 ejemplos de registros a modificar:');
    console.log('─'.repeat(80));
    console.log('ID\t\tFirst Name\t\t\tLast Name\t\tSlug');
    console.log('─'.repeat(80));
    
    recordsToFix.slice(0, 10).forEach(record => {
      const firstName = (record.first_name || '').substring(0, 25).padEnd(25);
      const lastName = (record.last_name || 'NULL').substring(0, 15).padEnd(15);
      console.log(`${record.id}\t\t${firstName}\t${lastName}\t\t${record.slug}`);
    });
    
    if (recordsToFix.length > 10) {
      console.log(`... y ${recordsToFix.length - 10} registros más`);
    }
    console.log('─'.repeat(80));
    
    // 2. Mostrar lo que se va a hacer
    console.log('\n🔄 Operación a realizar:');
    console.log('   - Mover contenido de first_name → last_name');
    console.log('   - Dejar first_name como NULL');
    console.log('   - Esto asegura que last_name siempre tenga un valor\n');
    
    // 3. Preguntar confirmación (modo dry-run por defecto)
    const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute');
    
    if (isDryRun) {
      console.log('⚠️  MODO DRY-RUN: No se realizarán cambios.');
      console.log('   Para ejecutar los cambios, usa: node fix-people-names.js --execute\n');
      
      // Mostrar SQL que se ejecutaría
      console.log('📜 SQL que se ejecutaría:');
      console.log('─'.repeat(80));
      console.log(`
UPDATE people 
SET 
  last_name = first_name,
  first_name = NULL,
  updated_at = NOW()
WHERE first_name IS NOT NULL 
  AND first_name != '' 
  AND (last_name IS NULL OR last_name = '');
      `);
      console.log('─'.repeat(80));
      
    } else {
      // 4. Ejecutar la actualización
      console.log('🚀 Ejecutando actualización...\n');
      
      const updateQuery = `
        UPDATE people 
        SET 
          last_name = first_name,
          first_name = NULL,
          updated_at = NOW()
        WHERE first_name IS NOT NULL 
          AND first_name != '' 
          AND (last_name IS NULL OR last_name = '')
        RETURNING id, first_name, last_name, slug
      `;
      
      const updateResult = await client.query(updateQuery);
      
      console.log(`✅ Registros actualizados: ${updateResult.rowCount}\n`);
      
      // Mostrar algunos ejemplos de los actualizados
      if (updateResult.rows.length > 0) {
        console.log('📝 Ejemplos de registros actualizados:');
        console.log('─'.repeat(80));
        console.log('ID\t\tFirst Name\t\tLast Name\t\t\tSlug');
        console.log('─'.repeat(80));
        
        updateResult.rows.slice(0, 10).forEach(record => {
          const firstName = (record.first_name || 'NULL').substring(0, 15).padEnd(15);
          const lastName = (record.last_name || '').substring(0, 25).padEnd(25);
          console.log(`${record.id}\t\t${firstName}\t\t${lastName}\t\t${record.slug}`);
        });
        console.log('─'.repeat(80));
      }
    }
    
    // 5. Estadísticas finales
    console.log('\n📊 Estadísticas de la tabla people:');
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN last_name IS NOT NULL AND last_name != '' THEN 1 END) as con_last_name,
        COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as con_first_name,
        COUNT(CASE WHEN (last_name IS NULL OR last_name = '') AND (first_name IS NULL OR first_name = '') THEN 1 END) as sin_nombres
      FROM people
    `;
    
    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log(`   Total de personas: ${stats.total}`);
    console.log(`   Con last_name: ${stats.con_last_name}`);
    console.log(`   Con first_name: ${stats.con_first_name}`);
    console.log(`   Sin ningún nombre: ${stats.sin_nombres}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
    console.log('\n✅ Conexión cerrada');
  }
}

// Ejecutar
console.log('🔧 Script para corregir nombres de personas');
console.log('   Mover first_name → last_name cuando last_name está vacío\n');
console.log('═'.repeat(80));
fixPeopleNames();