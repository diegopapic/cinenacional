// scripts/analyze-person-location-ids-fixed.js
// Script corregido para analizar qué representan los IDs de ubicación

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

// Función mejorada para extraer IDs de strings serializados de PHP
function extractIdsFromSerialized(serializedStr) {
  try {
    if (!serializedStr || serializedStr === '' || serializedStr === '0') {
      return [];
    }
    
    // Los datos vienen como: a:1:{i:0;s:5:"11229";}
    // o como: a:2:{i:0;s:5:"11429";i:1;s:5:"11727";}
    
    const ids = [];
    // Buscar todos los patrones s:X:"YYYY" donde YYYY es el ID
    const regex = /s:\d+:"(\d+)"/g;
    let match;
    
    while ((match = regex.exec(serializedStr)) !== null) {
      ids.push(parseInt(match[1]));
    }
    
    return ids;
  } catch (error) {
    console.error('Error procesando:', serializedStr, error.message);
    return [];
  }
}

async function analyzeLocationIds() {
  console.log('=== ANALIZANDO IDs DE UBICACIONES EN WORDPRESS ===\n');

  let wpConnection;
  
  try {
    wpConnection = await createConnection();
    console.log('✅ Conectado a MySQL\n');

    // 1. Primero veamos algunos ejemplos raw para entender el formato
    console.log('📋 1. EXAMINANDO FORMATO DE DATOS RAW\n');
    
    const [rawExamples] = await wpConnection.execute(`
      SELECT 
        p.post_title,
        pm.meta_key,
        pm.meta_value
      FROM wp_postmeta pm
      JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'persona'
      AND p.post_status = 'publish'
      AND pm.meta_key IN ('lugar_nacimiento', 'lugar_muerte', 'nacionalidad')
      AND pm.meta_value IS NOT NULL
      AND pm.meta_value != ''
      AND pm.meta_value != '0'
      AND p.post_title IN ('Jorge Luis Borges', 'Julio Cortázar', 'Graciela Borges')
      ORDER BY p.post_title, pm.meta_key
    `);

    console.log('Ejemplos de datos raw:');
    console.log('─'.repeat(80));
    rawExamples.forEach(row => {
      console.log(`Persona: ${row.post_title}`);
      console.log(`Campo: ${row.meta_key}`);
      console.log(`Valor raw: ${row.meta_value}`);
      const ids = extractIdsFromSerialized(row.meta_value);
      console.log(`IDs extraídos: ${ids.join(', ')}`);
      console.log('─'.repeat(80));
    });

    // 2. Recopilar todos los IDs únicos
    console.log('\n📍 2. RECOPILANDO TODOS LOS IDs ÚNICOS\n');
    
    const [allLocationData] = await wpConnection.execute(`
      SELECT pm.meta_value
      FROM wp_postmeta pm
      JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'persona'
      AND p.post_status = 'publish'
      AND pm.meta_key IN ('lugar_nacimiento', 'lugar_muerte', 'nacionalidad')
      AND pm.meta_value IS NOT NULL
      AND pm.meta_value != ''
      AND pm.meta_value != '0'
    `);

    const allIds = new Set();
    let processedCount = 0;
    
    allLocationData.forEach(row => {
      const ids = extractIdsFromSerialized(row.meta_value);
      ids.forEach(id => allIds.add(id));
      processedCount++;
    });

    console.log(`Procesados: ${processedCount} registros`);
    console.log(`IDs únicos encontrados: ${allIds.size}\n`);

    if (allIds.size === 0) {
      console.log('⚠️  No se pudieron extraer IDs. Verificando formato de datos...\n');
      
      // Mostrar algunos valores raw para debug
      const [debugData] = await wpConnection.execute(`
        SELECT pm.meta_value
        FROM wp_postmeta pm
        JOIN wp_posts p ON pm.post_id = p.ID
        WHERE p.post_type = 'persona'
        AND p.post_status = 'publish'
        AND pm.meta_key = 'lugar_nacimiento'
        AND pm.meta_value IS NOT NULL
        AND pm.meta_value != ''
        AND pm.meta_value != '0'
        LIMIT 5
      `);
      
      console.log('Primeros 5 valores de lugar_nacimiento:');
      debugData.forEach((row, index) => {
        console.log(`${index + 1}. "${row.meta_value}"`);
      });
      
      return;
    }

    // 3. Identificar qué son estos IDs
    console.log('🔍 3. IDENTIFICANDO QUÉ SON ESTOS IDs\n');
    
    const idsArray = Array.from(allIds);
    const sampleIds = idsArray.slice(0, 10);
    
    for (const id of sampleIds) {
      const [postInfo] = await wpConnection.execute(`
        SELECT 
          ID,
          post_title,
          post_type,
          post_status,
          post_parent
        FROM wp_posts
        WHERE ID = ?
      `, [id]);

      if (postInfo.length > 0) {
        const post = postInfo[0];
        console.log(`ID ${id}: ${post.post_title} (tipo: ${post.post_type})`);
        
        // Si tiene parent, mostrar la jerarquía
        if (post.post_parent > 0) {
          const [parentInfo] = await wpConnection.execute(`
            SELECT post_title, post_type, post_parent
            FROM wp_posts
            WHERE ID = ?
          `, [post.post_parent]);
          
          if (parentInfo.length > 0) {
            console.log(`  └─ Parent: ${parentInfo[0].post_title}`);
            
            // Verificar si hay abuelo
            if (parentInfo[0].post_parent > 0) {
              const [grandparentInfo] = await wpConnection.execute(`
                SELECT post_title, post_type
                FROM wp_posts
                WHERE ID = ?
              `, [parentInfo[0].post_parent]);
              
              if (grandparentInfo.length > 0) {
                console.log(`     └─ Grandparent: ${grandparentInfo[0].post_title}`);
              }
            }
          }
        }
      }
    }

    // 4. Verificar si estos IDs existen en Supabase
    console.log('\n🔗 4. SUGERENCIA PARA VERIFICAR EN SUPABASE\n');
    console.log('Ya que migraste los lugares con los mismos IDs, puedes verificar en Supabase:');
    console.log('\nEjemplos de IDs para verificar:');
    sampleIds.forEach(id => {
      console.log(`  - ID ${id}`);
    });
    
    // 5. Estadísticas
    console.log('\n📊 5. ESTADÍSTICAS DE MIGRACIÓN\n');
    
    const [stats] = await wpConnection.execute(`
      SELECT 
        COUNT(DISTINCT CASE WHEN lnac.meta_value IS NOT NULL AND lnac.meta_value != '' THEN p.ID END) as con_lugar_nacimiento,
        COUNT(DISTINCT CASE WHEN lmue.meta_value IS NOT NULL AND lmue.meta_value != '' THEN p.ID END) as con_lugar_muerte,
        COUNT(DISTINCT CASE WHEN nac.meta_value IS NOT NULL AND nac.meta_value != '' THEN p.ID END) as con_nacionalidad,
        COUNT(DISTINCT p.ID) as total_personas
      FROM wp_posts p
      LEFT JOIN wp_postmeta lnac ON p.ID = lnac.post_id AND lnac.meta_key = 'lugar_nacimiento'
      LEFT JOIN wp_postmeta lmue ON p.ID = lmue.post_id AND lmue.meta_key = 'lugar_muerte'
      LEFT JOIN wp_postmeta nac ON p.ID = nac.post_id AND nac.meta_key = 'nacionalidad'
      WHERE p.post_type = 'persona'
      AND p.post_status = 'publish'
    `);

    console.log(`Total de personas: ${stats[0].total_personas}`);
    console.log(`Con lugar de nacimiento: ${stats[0].con_lugar_nacimiento} (${Math.round(stats[0].con_lugar_nacimiento / stats[0].total_personas * 100)}%)`);
    console.log(`Con lugar de muerte: ${stats[0].con_lugar_muerte} (${Math.round(stats[0].con_lugar_muerte / stats[0].total_personas * 100)}%)`);
    console.log(`Con nacionalidad: ${stats[0].con_nacionalidad} (${Math.round(stats[0].con_nacionalidad / stats[0].total_personas * 100)}%)`);

    // 6. Mostrar algunos lugares más comunes
    if (idsArray.length > 0) {
      console.log('\n🌍 6. LUGARES MÁS COMUNES\n');
      
      // Contar frecuencia
      const locationCount = new Map();
      
      allLocationData.forEach(row => {
        const ids = extractIdsFromSerialized(row.meta_value);
        // Solo contar el primer ID (el más específico)
        if (ids.length > 0) {
          const mainId = ids[0];
          locationCount.set(mainId, (locationCount.get(mainId) || 0) + 1);
        }
      });
      
      // Top 10
      const sorted = Array.from(locationCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      console.log('Top 10 lugares más frecuentes:');
      for (const [locationId, count] of sorted) {
        const [place] = await wpConnection.execute(
          'SELECT post_title FROM wp_posts WHERE ID = ?',
          [locationId]
        );
        if (place.length > 0) {
          console.log(`  ${place[0].post_title} (ID: ${locationId}): ${count} menciones`);
        }
      }
    }

    console.log('\n✅ ANÁLISIS COMPLETADO');
    console.log('\n💡 PRÓXIMO PASO: Crear script de migración para actualizar birthLocationId y deathLocationId en Supabase');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (wpConnection) {
      await wpConnection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  analyzeLocationIds().catch(console.error);
}

module.exports = { analyzeLocationIds };