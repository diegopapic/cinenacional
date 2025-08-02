const mysql = require('mysql2/promise');

async function analyzeSoundTaxonomy() {
  let connection;
  
  try {
    // Conectar a la base de datos WordPress local
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Ajustar según tu configuración local
      database: 'wordpress_cine'
    });

    console.log('Conectado a la base de datos WordPress local\n');
    console.log('='.repeat(70));
    console.log('ANÁLISIS DE TAXONOMÍA DE SONIDO');
    console.log('='.repeat(70));

    // 1. Buscar los términos que corresponden a los IDs encontrados (1, 2, 3)
    console.log('\n1. TÉRMINOS DE SONIDO EN wp_terms:');
    console.log('-'.repeat(50));
    
    const [terms] = await connection.execute(`
      SELECT 
        term_id,
        name,
        slug
      FROM wp_terms
      WHERE term_id IN (1, 2, 3)
      ORDER BY term_id
    `);

    if (terms.length > 0) {
      console.log('ID | Nombre         | Slug');
      console.log('-'.repeat(50));
      terms.forEach(term => {
        console.log(`${term.term_id.toString().padEnd(2)} | ${term.name.padEnd(14)} | ${term.slug}`);
      });
    }

    // 2. Verificar si existe una taxonomía específica para sonido
    console.log('\n\n2. BÚSQUEDA DE TAXONOMÍA DE SONIDO:');
    console.log('-'.repeat(50));
    
    // Buscar en wp_term_taxonomy
    const [taxonomies] = await connection.execute(`
      SELECT DISTINCT 
        tt.taxonomy,
        COUNT(*) as count
      FROM wp_term_taxonomy tt
      WHERE tt.term_id IN (1, 2, 3)
      GROUP BY tt.taxonomy
    `);

    if (taxonomies.length > 0) {
      console.log('Taxonomías encontradas para estos términos:');
      taxonomies.forEach(tax => {
        console.log(`  - ${tax.taxonomy} (${tax.count} términos)`);
      });
    }

    // 3. Buscar todas las taxonomías que podrían estar relacionadas con sonido
    console.log('\n\n3. BÚSQUEDA AMPLIADA DE TÉRMINOS RELACIONADOS CON SONIDO:');
    console.log('-'.repeat(50));
    
    const [soundRelatedTerms] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.taxonomy,
        tt.count as usage_count
      FROM wp_terms t
      JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE 
        t.name LIKE '%sonor%' OR 
        t.name LIKE '%muda%' OR 
        t.name LIKE '%sound%' OR
        t.slug LIKE '%sonor%' OR 
        t.slug LIKE '%muda%' OR 
        t.slug LIKE '%sound%' OR
        t.name IN ('Sonora', 'Muda', 'Desconocido', 'Sonoro', 'Mudo')
      ORDER BY t.term_id
    `);

    if (soundRelatedTerms.length > 0) {
      console.log('Términos encontrados relacionados con sonido:');
      console.log('ID   | Nombre              | Slug                | Taxonomía        | Usos');
      console.log('-'.repeat(80));
      soundRelatedTerms.forEach(term => {
        console.log(
          `${term.term_id.toString().padEnd(4)} | ` +
          `${term.name.padEnd(19)} | ` +
          `${term.slug.padEnd(19)} | ` +
          `${term.taxonomy.padEnd(16)} | ` +
          `${term.usage_count}`
        );
      });
    }

    // 4. Analizar la relación entre posts y términos
    console.log('\n\n4. RELACIÓN ENTRE PELÍCULAS Y TÉRMINOS DE SONIDO:');
    console.log('-'.repeat(50));

    // Verificar si los valores en postmeta son IDs de términos
    const [movieSoundRelations] = await connection.execute(`
      SELECT 
        pm.meta_value as sound_id,
        t.name as term_name,
        t.slug as term_slug,
        COUNT(*) as movie_count
      FROM wp_posts p
      JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'sonido'
      LEFT JOIN wp_terms t ON pm.meta_value = t.term_id
      WHERE p.post_type = 'pelicula' 
      AND p.post_status = 'publish'
      AND pm.meta_value IS NOT NULL
      AND pm.meta_value != ''
      GROUP BY pm.meta_value, t.name, t.slug
      ORDER BY pm.meta_value
    `);

    console.log('Meta Value | Término         | Slug            | Películas');
    console.log('-'.repeat(60));
    movieSoundRelations.forEach(rel => {
      console.log(
        `${rel.sound_id.padEnd(10)} | ` +
        `${(rel.term_name || 'NO ENCONTRADO').padEnd(15)} | ` +
        `${(rel.term_slug || '-').padEnd(15)} | ` +
        `${rel.movie_count}`
      );
    });

    // 5. Verificar si existe alguna relación directa con wp_term_relationships
    console.log('\n\n5. VERIFICACIÓN DE wp_term_relationships:');
    console.log('-'.repeat(50));

    // Obtener una muestra de películas y ver sus relaciones de términos
    const [sampleMovies] = await connection.execute(`
      SELECT ID, post_title 
      FROM wp_posts 
      WHERE post_type = 'pelicula' 
      AND post_status = 'publish' 
      LIMIT 5
    `);

    for (const movie of sampleMovies) {
      console.log(`\nPelícula: ${movie.post_title} (ID: ${movie.ID})`);
      
      // Ver todos los términos asociados
      const [movieTerms] = await connection.execute(`
        SELECT 
          t.term_id,
          t.name,
          t.slug,
          tt.taxonomy
        FROM wp_term_relationships tr
        JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
        JOIN wp_terms t ON tt.term_id = t.term_id
        WHERE tr.object_id = ?
      `, [movie.ID]);

      if (movieTerms.length > 0) {
        movieTerms.forEach(term => {
          console.log(`  - ${term.taxonomy}: ${term.name} (ID: ${term.term_id})`);
        });
      }

      // Ver el valor de sonido en postmeta
      const [soundMeta] = await connection.execute(`
        SELECT meta_value 
        FROM wp_postmeta 
        WHERE post_id = ? AND meta_key = 'sonido'
      `, [movie.ID]);

      if (soundMeta.length > 0) {
        console.log(`  - Sonido (postmeta): ${soundMeta[0].meta_value}`);
      }
    }

    // 6. Buscar todas las taxonomías registradas
    console.log('\n\n6. TODAS LAS TAXONOMÍAS EN EL SISTEMA:');
    console.log('-'.repeat(50));

    const [allTaxonomies] = await connection.execute(`
      SELECT 
        taxonomy,
        COUNT(*) as term_count
      FROM wp_term_taxonomy
      GROUP BY taxonomy
      ORDER BY taxonomy
    `);

    console.log('Taxonomía            | Términos');
    console.log('-'.repeat(35));
    allTaxonomies.forEach(tax => {
      console.log(`${tax.taxonomy.padEnd(20)} | ${tax.term_count}`);
    });

  } catch (error) {
    console.error('Error al analizar la taxonomía de sonido:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n\nConexión cerrada');
    }
  }
}

// Ejecutar el análisis
analyzeSoundTaxonomy();