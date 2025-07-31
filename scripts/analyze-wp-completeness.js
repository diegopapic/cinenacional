// analyze-wp-completeness.js
// Script para analizar los campos de completitud en WordPress

const mysql = require('mysql2/promise');

async function analyzeCompleteness() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Agrega tu contraseña
    database: 'wordpress_cine'
  });

  try {
    console.log('=== ANÁLISIS DE CAMPOS DE COMPLETITUD EN WORDPRESS ===\n');

    // 1. Buscar meta_keys relacionados con completitud
    console.log('1. Buscando meta_keys relacionados con completitud...');
    const [metaKeys] = await connection.execute(`
      SELECT DISTINCT meta_key, COUNT(*) as count
      FROM wp_postmeta 
      WHERE post_id IN (SELECT ID FROM wp_posts WHERE post_type = 'pelicula')
      AND (
        meta_key LIKE '%complet%' 
        OR meta_key LIKE '%gacetilla%' 
        OR meta_key LIKE '%estado%'
        OR meta_key LIKE '%status%'
        OR meta_key LIKE '%press%'
        OR meta_key LIKE '%ficha%'
      )
      GROUP BY meta_key
      ORDER BY count DESC
    `);
    
    console.log('Meta keys encontrados:');
    console.table(metaKeys);

    // 2. Para cada meta_key encontrado, ver sus valores únicos
    console.log('\n2. Valores únicos para cada meta_key:');
    for (const row of metaKeys) {
      const [values] = await connection.execute(`
        SELECT meta_value, COUNT(*) as count
        FROM wp_postmeta 
        WHERE meta_key = ?
        AND post_id IN (SELECT ID FROM wp_posts WHERE post_type = 'pelicula')
        AND meta_value IS NOT NULL
        AND meta_value != ''
        GROUP BY meta_value
        ORDER BY count DESC
      `, [row.meta_key]);
      
      console.log(`\n--- ${row.meta_key} ---`);
      console.table(values);
    }

    // 3. Ver ejemplos de películas con estos campos
    console.log('\n3. Ejemplos de películas con campos de completitud:');
    const [examples] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        p.post_status,
        GROUP_CONCAT(
          CONCAT(pm.meta_key, ':', pm.meta_value) 
          ORDER BY pm.meta_key 
          SEPARATOR ' | '
        ) as metadata
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
      WHERE p.post_type = 'pelicula'
      AND pm.meta_key IN (
        SELECT DISTINCT meta_key 
        FROM wp_postmeta 
        WHERE meta_key LIKE '%complet%' 
        OR meta_key LIKE '%gacetilla%' 
        OR meta_key LIKE '%estado%'
        OR meta_key LIKE '%ficha%'
      )
      GROUP BY p.ID
      LIMIT 10
    `);
    
    console.log('\nEjemplos de películas:');
    examples.forEach(movie => {
      console.log(`\nID: ${movie.ID} - ${movie.post_title}`);
      console.log(`Status: ${movie.post_status}`);
      console.log(`Metadata: ${movie.metadata}`);
    });

    // 4. Buscar todos los meta_keys de una película específica
    console.log('\n4. Todos los meta_keys de una película de ejemplo:');
    const [allMeta] = await connection.execute(`
      SELECT meta_key, meta_value
      FROM wp_postmeta
      WHERE post_id = (
        SELECT ID FROM wp_posts 
        WHERE post_type = 'pelicula' 
        AND post_status = 'publish'
        LIMIT 1
      )
      ORDER BY meta_key
    `);
    
    console.log('\nTodos los campos de una película:');
    console.table(allMeta.slice(0, 30)); // Primeros 30 campos

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar el análisis
analyzeCompleteness().catch(console.error);