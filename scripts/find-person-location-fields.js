// scripts/find-person-location-fields.js
// Script para encontrar dónde guarda WordPress los lugares de nacimiento y muerte de personas

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

async function findPersonLocationFields() {
  console.log('=== BUSCANDO CAMPOS DE UBICACIÓN/LUGARES EN PERSONAS ===\n');

  let wpConnection;
  
  try {
    wpConnection = await createConnection();
    console.log('✅ Conectado a MySQL\n');

    // 1. Buscar TODOS los meta_keys que podrían ser lugares/ubicaciones
    console.log('🔍 1. BUSCANDO META_KEYS RELACIONADOS CON LUGARES\n');
    
    const [allLocationKeys] = await wpConnection.execute(`
      SELECT DISTINCT pm.meta_key, COUNT(*) as frecuencia
      FROM wp_postmeta pm
      JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'persona'
      AND p.post_status = 'publish'
      AND (
        pm.meta_key LIKE '%lugar%' 
        OR pm.meta_key LIKE '%location%' 
        OR pm.meta_key LIKE '%place%' 
        OR pm.meta_key LIKE '%ciudad%' 
        OR pm.meta_key LIKE '%city%'
        OR pm.meta_key LIKE '%pais%'
        OR pm.meta_key LIKE '%country%'
        OR pm.meta_key LIKE '%provincia%'
        OR pm.meta_key LIKE '%state%'
        OR pm.meta_key LIKE '%nacimiento%'
        OR pm.meta_key LIKE '%birth%'
        OR pm.meta_key LIKE '%muerte%'
        OR pm.meta_key LIKE '%death%'
        OR pm.meta_key LIKE '%origen%'
        OR pm.meta_key LIKE '%nacionalidad%'
        OR pm.meta_key LIKE '%nationality%'
      )
      GROUP BY pm.meta_key
      ORDER BY frecuencia DESC
    `);

    console.log('META_KEYS encontrados:');
    console.log('═'.repeat(60));
    allLocationKeys.forEach(row => {
      console.log(`  📍 ${row.meta_key}: ${row.frecuencia} usos`);
    });

    // 2. Buscar personas específicas conocidas para ver su estructura
    console.log('\n👤 2. EXAMINANDO PERSONAS ESPECÍFICAS CON LUGARES CONOCIDOS\n');
    
    // Buscar algunas personas que probablemente tengan lugares
    const [samplePersons] = await wpConnection.execute(`
      SELECT p.ID, p.post_title
      FROM wp_posts p
      WHERE p.post_type = 'persona'
      AND p.post_status = 'publish'
      AND (
        p.post_title LIKE '%Borges%'
        OR p.post_title LIKE '%Cortázar%'
        OR p.post_title LIKE '%Puenzo%'
        OR p.post_title LIKE '%Darín%'
      )
      LIMIT 5
    `);

    for (const person of samplePersons) {
      console.log(`\n📋 Examinando: ${person.post_title} (ID: ${person.ID})`);
      console.log('─'.repeat(50));
      
      // Obtener TODOS los metadatos de esta persona
      const [allMeta] = await wpConnection.execute(`
        SELECT meta_key, meta_value
        FROM wp_postmeta
        WHERE post_id = ?
        AND (
          meta_key LIKE '%lugar%'
          OR meta_key LIKE '%location%'
          OR meta_key LIKE '%ciudad%'
          OR meta_key LIKE '%pais%'
          OR meta_key LIKE '%nacimiento%'
          OR meta_key LIKE '%muerte%'
          OR meta_key LIKE '%nacionalidad%'
        )
        ORDER BY meta_key
      `, [person.ID]);

      if (allMeta.length > 0) {
        console.log('Campos de ubicación encontrados:');
        allMeta.forEach(row => {
          // Truncar valores muy largos para mejor visualización
          const value = row.meta_value ? 
            (row.meta_value.length > 100 ? row.meta_value.substring(0, 100) + '...' : row.meta_value) : 
            '[vacío]';
          console.log(`  🗺️  ${row.meta_key}: "${value}"`);
        });
      } else {
        console.log('  ⚠️  No se encontraron campos de ubicación');
      }
    }

    // 3. Buscar ejemplos de cada campo de ubicación encontrado
    console.log('\n📊 3. ANÁLISIS DETALLADO DE CAMPOS DE UBICACIÓN\n');
    
    // Filtrar solo campos con más de 10 usos
    const relevantLocationKeys = allLocationKeys.filter(key => key.frecuencia > 10);
    
    for (const locationKey of relevantLocationKeys) {
      console.log(`\n🌍 CAMPO: ${locationKey.meta_key} (${locationKey.frecuencia} registros)`);
      console.log('─'.repeat(50));
      
      // Obtener ejemplos con valores
      const [examples] = await wpConnection.execute(`
        SELECT p.post_title, pm.meta_value
        FROM wp_postmeta pm
        JOIN wp_posts p ON pm.post_id = p.ID
        WHERE p.post_type = 'persona'
        AND p.post_status = 'publish'
        AND pm.meta_key = ?
        AND pm.meta_value IS NOT NULL
        AND pm.meta_value != ''
        AND pm.meta_value != '0'
        ORDER BY LENGTH(pm.meta_value) DESC
        LIMIT 10
      `, [locationKey.meta_key]);

      if (examples.length > 0) {
        // Analizar el tipo de datos
        const isNumeric = examples.every(row => /^\d+$/.test(row.meta_value));
        const hasCommas = examples.some(row => row.meta_value.includes(','));
        const hasPipes = examples.some(row => row.meta_value.includes('|'));
        
        console.log(`  Tipo de datos: ${isNumeric ? '🔢 NUMÉRICO (posible ID)' : '📝 TEXTO'}`);
        if (hasCommas) console.log(`  ⚠️  Contiene comas (posible lista)`);
        if (hasPipes) console.log(`  ⚠️  Contiene pipes (posible separador)`);
        
        console.log('\n  Ejemplos:');
        examples.forEach((row, index) => {
          const value = row.meta_value.length > 60 ? 
            row.meta_value.substring(0, 60) + '...' : 
            row.meta_value;
          console.log(`    ${index + 1}. ${row.post_title}: "${value}"`);
        });
      } else {
        console.log('  ❌ No hay valores en este campo');
      }
    }

    // 4. Analizar si hay taxonomías relacionadas con lugares
    console.log('\n🏷️  4. BUSCANDO TAXONOMÍAS DE LUGARES\n');
    
    const [taxonomies] = await wpConnection.execute(`
      SELECT DISTINCT tt.taxonomy, COUNT(*) as cantidad
      FROM wp_term_relationships tr
      JOIN wp_posts p ON tr.object_id = p.ID
      JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
      WHERE p.post_type = 'persona'
      AND p.post_status = 'publish'
      AND (
        tt.taxonomy LIKE '%lugar%'
        OR tt.taxonomy LIKE '%location%'
        OR tt.taxonomy LIKE '%ciudad%'
        OR tt.taxonomy LIKE '%pais%'
        OR tt.taxonomy LIKE '%nacionalidad%'
      )
      GROUP BY tt.taxonomy
    `);

    if (taxonomies.length > 0) {
      console.log('Taxonomías encontradas:');
      taxonomies.forEach(row => {
        console.log(`  🏷️  ${row.taxonomy}: ${row.cantidad} relaciones`);
      });
      
      // Mostrar ejemplos de términos
      for (const tax of taxonomies) {
        console.log(`\n  Términos en ${tax.taxonomy}:`);
        const [terms] = await wpConnection.execute(`
          SELECT DISTINCT t.name, COUNT(*) as usado
          FROM wp_terms t
          JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
          JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
          JOIN wp_posts p ON tr.object_id = p.ID
          WHERE p.post_type = 'persona'
          AND p.post_status = 'publish'
          AND tt.taxonomy = ?
          GROUP BY t.name
          ORDER BY usado DESC
          LIMIT 10
        `, [tax.taxonomy]);
        
        terms.forEach(term => {
          console.log(`    • ${term.name} (${term.usado} personas)`);
        });
      }
    } else {
      console.log('  ℹ️  No se encontraron taxonomías de lugares');
    }

    // 5. Buscar si hay referencias a IDs de ubicaciones
    console.log('\n🔗 5. ANALIZANDO POSIBLES REFERENCIAS A IDs\n');
    
    // Buscar campos que parecen ser IDs
    const possibleIdFields = allLocationKeys.filter(key => 
      key.meta_key.includes('_id') || 
      key.meta_key.includes('ID') ||
      key.meta_key.endsWith('_location') ||
      key.meta_key.endsWith('_place')
    );
    
    for (const field of possibleIdFields) {
      console.log(`\n🔍 Campo: ${field.meta_key}`);
      
      const [sample] = await wpConnection.execute(`
        SELECT pm.meta_value, COUNT(*) as cantidad
        FROM wp_postmeta pm
        JOIN wp_posts p ON pm.post_id = p.ID
        WHERE p.post_type = 'persona'
        AND p.post_status = 'publish'
        AND pm.meta_key = ?
        AND pm.meta_value IS NOT NULL
        AND pm.meta_value != ''
        AND pm.meta_value != '0'
        GROUP BY pm.meta_value
        ORDER BY cantidad DESC
        LIMIT 5
      `, [field.meta_key]);
      
      if (sample.length > 0) {
        console.log('  Valores más frecuentes:');
        sample.forEach(row => {
          console.log(`    • "${row.meta_value}": ${row.cantidad} veces`);
        });
        
        // Si parece ser un ID, buscar en wp_posts
        if (/^\d+$/.test(sample[0].meta_value)) {
          const [relatedPost] = await wpConnection.execute(`
            SELECT ID, post_title, post_type
            FROM wp_posts
            WHERE ID = ?
            LIMIT 1
          `, [sample[0].meta_value]);
          
          if (relatedPost.length > 0) {
            console.log(`  ✅ ID ${sample[0].meta_value} corresponde a: ${relatedPost[0].post_title} (tipo: ${relatedPost[0].post_type})`);
          }
        }
      }
    }

    // 6. Análisis de patrones comunes
    console.log('\n📈 6. RESUMEN Y PATRONES ENCONTRADOS\n');
    
    // Contar personas con lugares
    const [stats] = await wpConnection.execute(`
      SELECT 
        COUNT(DISTINCT p.ID) as total_personas,
        COUNT(DISTINCT CASE WHEN pm.meta_key LIKE '%lugar_nacimiento%' THEN p.ID END) as con_lugar_nacimiento,
        COUNT(DISTINCT CASE WHEN pm.meta_key LIKE '%lugar_muerte%' THEN p.ID END) as con_lugar_muerte,
        COUNT(DISTINCT CASE WHEN pm.meta_key LIKE '%nacionalidad%' THEN p.ID END) as con_nacionalidad
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
      WHERE p.post_type = 'persona'
      AND p.post_status = 'publish'
    `);
    
    console.log('Estadísticas generales:');
    console.log(`  • Total de personas: ${stats[0].total_personas}`);
    console.log(`  • Con lugar de nacimiento: ${stats[0].con_lugar_nacimiento}`);
    console.log(`  • Con lugar de muerte: ${stats[0].con_lugar_muerte}`);
    console.log(`  • Con nacionalidad: ${stats[0].con_nacionalidad}`);

    console.log('\n✅ EXPLORACIÓN COMPLETADA');
    console.log('\n💡 PRÓXIMO PASO: Basándote en los campos encontrados, crear script de migración');

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
  findPersonLocationFields().catch(console.error);
}

module.exports = { findPersonLocationFields };