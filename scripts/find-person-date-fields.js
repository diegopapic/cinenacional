// scripts/find-person-date-fields.js
// Script simple para encontrar dónde guarda WordPress las fechas de personas

const mysql = require('mysql2/promise');

async function createConnection() {
  return await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'wordpress_cine',
    charset: 'utf8mb4'
  });
}

async function findPersonDateFields() {
  console.log('=== BUSCANDO CAMPOS DE FECHAS EN PERSONAS ===\n');

  let wpConnection;
  
  try {
    wpConnection = await createConnection();
    console.log('✅ Conectado a MySQL\n');

    // 1. Buscar TODOS los meta_keys que podrían ser fechas
    console.log('🔍 1. BUSCANDO META_KEYS RELACIONADOS CON FECHAS\n');
    
    const [allDateKeys] = await wpConnection.execute(`
      SELECT DISTINCT pm.meta_key, COUNT(*) as frecuencia
      FROM wp_postmeta pm
      JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'persona'
      AND p.post_status = 'publish'
      AND (
        pm.meta_key LIKE '%fecha%' 
        OR pm.meta_key LIKE '%birth%' 
        OR pm.meta_key LIKE '%death%' 
        OR pm.meta_key LIKE '%nacimiento%' 
        OR pm.meta_key LIKE '%muerte%'
        OR pm.meta_key LIKE '%born%'
        OR pm.meta_key LIKE '%died%'
        OR pm.meta_key LIKE '%age%'
        OR pm.meta_key LIKE '%edad%'
      )
      GROUP BY pm.meta_key
      ORDER BY frecuencia DESC
    `);

    console.log('META_KEYS encontrados:');
    allDateKeys.forEach(row => {
      console.log(`  📅 ${row.meta_key}: ${row.frecuencia} usos`);
    });

    // 2. Buscar una persona específica conocida para ver su estructura
    console.log('\n👤 2. EXAMINANDO UNA PERSONA ESPECÍFICA\n');
    
    const [samplePerson] = await wpConnection.execute(`
      SELECT p.ID, p.post_title
      FROM wp_posts p
      WHERE p.post_type = 'persona'
      AND p.post_status = 'publish'
      AND p.post_title LIKE '%Víctor%'
      LIMIT 1
    `);

    if (samplePerson.length > 0) {
      const personId = samplePerson[0].ID;
      const personName = samplePerson[0].post_title;
      
      console.log(`Examinando: ${personName} (ID: ${personId})`);
      
      // Obtener TODOS los metadatos de esta persona
      const [allMeta] = await wpConnection.execute(`
        SELECT meta_key, meta_value
        FROM wp_postmeta
        WHERE post_id = ?
        ORDER BY meta_key
      `, [personId]);

      console.log('\nTODOS los metadatos de esta persona:');
      allMeta.forEach(row => {
        if (row.meta_key.includes('fecha') || 
            row.meta_key.includes('birth') || 
            row.meta_key.includes('death') ||
            row.meta_key.includes('nacimiento') ||
            row.meta_key.includes('muerte') ||
            row.meta_key.includes('age') ||
            row.meta_key.includes('edad')) {
          console.log(`  🗓️  ${row.meta_key}: "${row.meta_value}"`);
        } else {
          console.log(`     ${row.meta_key}: "${row.meta_value}"`);
        }
      });
    }

    // 3. Buscar ejemplos de cada campo de fecha encontrado
    console.log('\n📋 3. EJEMPLOS DE CADA CAMPO DE FECHA\n');
    
    for (const dateKey of allDateKeys) {
      if (dateKey.frecuencia > 10) { // Solo campos que se usan frecuentemente
        console.log(`\n📅 CAMPO: ${dateKey.meta_key}`);
        
        const [examples] = await wpConnection.execute(`
          SELECT p.post_title, pm.meta_value
          FROM wp_postmeta pm
          JOIN wp_posts p ON pm.post_id = p.ID
          WHERE p.post_type = 'persona'
          AND p.post_status = 'publish'
          AND pm.meta_key = ?
          AND pm.meta_value IS NOT NULL
          AND pm.meta_value != ''
          LIMIT 5
        `, [dateKey.meta_key]);

        examples.forEach(row => {
          console.log(`   ${row.post_title}: "${row.meta_value}"`);
        });
      }
    }

    // 4. Análisis específico de formatos de fecha
    console.log('\n🔬 4. ANÁLISIS DE FORMATOS DE FECHA\n');
    
    const commonDateFields = ['fecha_nacimiento', 'fecha_muerte', 'fecha_nacimiento_import', 'fecha_muerte_import'];
    
    for (const field of commonDateFields) {
      console.log(`\n📊 ANÁLISIS DE: ${field}`);
      
      const [formatStats] = await wpConnection.execute(`
        SELECT 
          CASE 
            WHEN meta_value REGEXP '^[0-9]{8}$' THEN 'YYYYMMDD (8 dígitos)'
            WHEN meta_value REGEXP '^[0-9]{4}$' THEN 'YYYY (4 dígitos)'  
            WHEN meta_value REGEXP '^[0-9]{6}$' THEN 'YYYYMM (6 dígitos)'
            WHEN meta_value REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 'YYYY-MM-DD (ISO)'
            WHEN meta_value = '0000-00-00' THEN 'Fecha vacía'
            WHEN meta_value = '' THEN 'Vacío'
            ELSE 'Otro formato'
          END as formato,
          COUNT(*) as cantidad,
          MIN(meta_value) as ejemplo
        FROM wp_postmeta pm
        JOIN wp_posts p ON pm.post_id = p.ID
        WHERE p.post_type = 'persona'
        AND p.post_status = 'publish'
        AND pm.meta_key = ?
        GROUP BY formato
        ORDER BY cantidad DESC
      `, [field]);

      if (formatStats.length > 0) {
        formatStats.forEach(row => {
          console.log(`   ${row.formato}: ${row.cantidad} registros (ej: "${row.ejemplo}")`);
        });
      } else {
        console.log(`   ❌ Campo no encontrado o sin datos`);
      }
    }

    console.log('\n✅ EXPLORACIÓN COMPLETADA');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (wpConnection) {
      await wpConnection.end();
    }
  }
}

if (require.main === module) {
  findPersonDateFields().catch(console.error);
}

module.exports = { findPersonDateFields };