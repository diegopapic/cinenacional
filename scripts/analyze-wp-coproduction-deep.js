const mysql = require('mysql2/promise');
const phpUnserialize = require('php-unserialize');

async function analyzeCoproductionDeep() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Ajustar según tu configuración local
    database: 'wordpress_cine'
  });

  try {
    console.log('=== ANÁLISIS PROFUNDO DE PAÍSES COPRODUCTORES ===\n');

    // 1. Buscar el término 7362 en wp_terms
    console.log('=== BUSCANDO TÉRMINO 7362 ===');
    const [term7362] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.taxonomy,
        tt.description,
        tt.parent,
        tt.count
      FROM wp_terms t
      LEFT JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE t.term_id = 7362
    `);

    if (term7362.length > 0) {
      console.log('Término encontrado:');
      term7362.forEach(term => {
        console.log(`- ID: ${term.term_id}`);
        console.log(`- Nombre: ${term.name}`);
        console.log(`- Slug: ${term.slug}`);
        console.log(`- Taxonomía: ${term.taxonomy}`);
        console.log(`- Descripción: ${term.description || 'N/A'}`);
        console.log(`- Count: ${term.count}`);
      });
    } else {
      console.log('El término 7362 NO fue encontrado en wp_terms');
    }

    // 2. Buscar TODAS las taxonomías disponibles
    console.log('\n\n=== TODAS LAS TAXONOMÍAS DISPONIBLES ===');
    const [taxonomies] = await connection.execute(`
      SELECT 
        DISTINCT taxonomy,
        COUNT(*) as total_terms
      FROM wp_term_taxonomy
      GROUP BY taxonomy
      ORDER BY taxonomy
    `);

    console.log('Taxonomías encontradas:');
    taxonomies.forEach(tax => {
      console.log(`- ${tax.taxonomy}: ${tax.total_terms} términos`);
    });

    // 3. Buscar países en cualquier taxonomía que pueda contenerlos
    console.log('\n\n=== BÚSQUEDA DE PAÍSES EN TODAS LAS TAXONOMÍAS ===');
    const countryKeywords = ['España', 'Francia', 'Italia', 'Estados Unidos', 'Brasil', 'México', 'Chile', 'Uruguay', 'Colombia', 'Perú'];
    
    for (const keyword of countryKeywords) {
      const [countryTerms] = await connection.execute(`
        SELECT 
          t.term_id,
          t.name,
          t.slug,
          tt.taxonomy
        FROM wp_terms t
        JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
        WHERE t.name LIKE ?
        LIMIT 5
      `, [`%${keyword}%`]);

      if (countryTerms.length > 0) {
        console.log(`\nPaíses encontrados con "${keyword}":`);
        countryTerms.forEach(term => {
          console.log(`  - ID: ${term.term_id}, Nombre: ${term.name}, Taxonomía: ${term.taxonomy}`);
        });
      }
    }

    // 4. Analizar valores únicos de coproducción
    console.log('\n\n=== VALORES ÚNICOS DE COPRODUCCIÓN ===');
    const [uniqueValues] = await connection.execute(`
      SELECT 
        meta_value,
        COUNT(*) as count
      FROM wp_postmeta
      WHERE meta_key = 'coproduccion'
      AND meta_value != ''
      AND meta_value IS NOT NULL
      GROUP BY meta_value
      ORDER BY count DESC
      LIMIT 20
    `);

    console.log('Top 20 valores más frecuentes:');
    uniqueValues.forEach((row, index) => {
      console.log(`${index + 1}. Valor: "${row.meta_value}" - Aparece en ${row.count} películas`);
      
      // Intentar deserializar y mostrar el contenido
      if (row.meta_value.startsWith('a:')) {
        try {
          const unserialized = phpUnserialize.unserialize(row.meta_value);
          console.log(`   Deserializado: ${JSON.stringify(unserialized)}`);
        } catch (e) {
          // Intentar con regex si falla php-unserialize
          const matches = row.meta_value.match(/s:\d+:"([^"]+)"/g);
          if (matches) {
            const values = matches.map(m => m.match(/s:\d+:"([^"]+)"/)[1]);
            console.log(`   Valores extraídos: ${values.join(', ')}`);
          }
        }
      }
    });

    // 5. Buscar películas con múltiples países coproductores
    console.log('\n\n=== PELÍCULAS CON MÚLTIPLES COPRODUCTORES ===');
    const [multipleCountries] = await connection.execute(`
      SELECT 
        pm.post_id,
        p.post_title,
        pm.meta_value
      FROM wp_postmeta pm
      JOIN wp_posts p ON p.ID = pm.post_id
      WHERE pm.meta_key = 'coproduccion'
      AND pm.meta_value LIKE 'a:2:%' OR pm.meta_value LIKE 'a:3:%' OR pm.meta_value LIKE 'a:4:%'
      AND p.post_type = 'pelicula'
      AND p.post_status = 'publish'
      LIMIT 10
    `);

    if (multipleCountries.length > 0) {
      console.log('Películas con múltiples países:');
      multipleCountries.forEach(row => {
        console.log(`\n- ${row.post_title}`);
        console.log(`  Valor: ${row.meta_value}`);
        
        // Extraer IDs
        const matches = row.meta_value.match(/s:\d+:"(\d+)"/g);
        if (matches) {
          const ids = matches.map(m => m.match(/s:\d+:"(\d+)"/)[1]);
          console.log(`  IDs extraídos: ${ids.join(', ')}`);
        }
      });
    } else {
      console.log('No se encontraron películas con múltiples coproductores');
    }

    // 6. Buscar en todas las tablas de metadatos por el ID 7362
    console.log('\n\n=== BÚSQUEDA GLOBAL DEL ID 7362 ===');
    
    // En wp_options
    const [inOptions] = await connection.execute(`
      SELECT option_name, option_value
      FROM wp_options
      WHERE option_value LIKE '%7362%'
      LIMIT 5
    `);
    
    if (inOptions.length > 0) {
      console.log('\nEncontrado en wp_options:');
      inOptions.forEach(row => {
        console.log(`- ${row.option_name}: ${row.option_value.substring(0, 100)}...`);
      });
    }

    // En wp_postmeta (otros meta_keys)
    const [inPostmeta] = await connection.execute(`
      SELECT DISTINCT meta_key, COUNT(*) as count
      FROM wp_postmeta
      WHERE meta_value LIKE '%7362%'
      GROUP BY meta_key
      ORDER BY count DESC
      LIMIT 10
    `);
    
    if (inPostmeta.length > 0) {
      console.log('\nEncontrado en wp_postmeta:');
      inPostmeta.forEach(row => {
        console.log(`- meta_key: ${row.meta_key} (${row.count} veces)`);
      });
    }

    // 7. Analizar la estructura de los valores serializados
    console.log('\n\n=== ESTRUCTURA DE ARRAYS SERIALIZADOS ===');
    const [samples] = await connection.execute(`
      SELECT DISTINCT meta_value
      FROM wp_postmeta
      WHERE meta_key = 'coproduccion'
      AND meta_value != ''
      ORDER BY LENGTH(meta_value)
      LIMIT 10
    `);

    samples.forEach((row, index) => {
      console.log(`\nEjemplo ${index + 1}: ${row.meta_value}`);
      
      // Contar elementos en el array
      const arrayMatch = row.meta_value.match(/^a:(\d+):/);
      if (arrayMatch) {
        console.log(`  Número de elementos: ${arrayMatch[1]}`);
      }
    });

    // 8. Verificar si hay otras meta_keys relacionadas con países
    console.log('\n\n=== OTRAS META_KEYS RELACIONADAS CON PAÍSES ===');
    const [countryRelatedMeta] = await connection.execute(`
      SELECT DISTINCT meta_key, COUNT(*) as count
      FROM wp_postmeta
      WHERE (
        meta_key LIKE '%pais%' OR 
        meta_key LIKE '%country%' OR 
        meta_key LIKE '%nation%' OR
        meta_key LIKE '%origen%' OR
        meta_key LIKE '%produccion%'
      )
      GROUP BY meta_key
      ORDER BY count DESC
    `);

    console.log('Meta keys encontradas:');
    countryRelatedMeta.forEach(row => {
      console.log(`- ${row.meta_key}: ${row.count} registros`);
    });

  } catch (error) {
    console.error('Error durante el análisis:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar el análisis
analyzeCoproductionDeep()
  .then(() => console.log('\nAnálisis profundo completado'))
  .catch(console.error);