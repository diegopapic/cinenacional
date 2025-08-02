const mysql = require('mysql2/promise');

// Configuración de la base de datos local WordPress
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wordpress_cine'
};

async function analyzeClassification() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos WordPress local\n');

    console.log('=== ANÁLISIS DE CLASIFICACIÓN EN WORDPRESS ===\n');

    // 1. Analizar valores únicos de clasificación en wp_postmeta
    console.log('1. VALORES ÚNICOS DE CLASIFICACIÓN EN wp_postmeta:');
    console.log('------------------------------------------------');
    
    const [classificationValues] = await connection.execute(`
      SELECT 
        meta_value as clasificacion,
        COUNT(*) as cantidad
      FROM wp_postmeta
      WHERE meta_key = 'clasificacion'
        AND meta_value IS NOT NULL
        AND meta_value != ''
      GROUP BY meta_value
      ORDER BY cantidad DESC
    `);

    console.log('Clasificaciones encontradas:');
    classificationValues.forEach((row, index) => {
      console.log(`${index + 1}. "${row.clasificacion}" - ${row.cantidad} películas`);
    });

    // 2. Analizar si las clasificaciones están relacionadas con términos
    console.log('\n\n2. ANÁLISIS DE RELACIÓN CON TAXONOMÍAS:');
    console.log('----------------------------------------');

    // Buscar términos que coincidan con las clasificaciones
    const classificationNames = classificationValues.map(c => c.clasificacion);
    const placeholders = classificationNames.map(() => '?').join(',');
    
    const [terms] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.taxonomy,
        tt.description,
        tt.count
      FROM wp_terms t
      INNER JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE t.name IN (${placeholders})
         OR t.slug IN (${placeholders})
      ORDER BY tt.taxonomy, t.name
    `, [...classificationNames, ...classificationNames]);

    if (terms.length > 0) {
      console.log('Términos encontrados que coinciden con las clasificaciones:');
      terms.forEach(term => {
        console.log(`\nTérmino: "${term.name}"`);
        console.log(`  - ID: ${term.term_id}`);
        console.log(`  - Slug: ${term.slug}`);
        console.log(`  - Taxonomía: ${term.taxonomy}`);
        console.log(`  - Descripción: ${term.description || 'Sin descripción'}`);
        console.log(`  - Uso: ${term.count} veces`);
      });
    } else {
      console.log('No se encontraron términos que coincidan con las clasificaciones.');
    }

    // 3. Buscar todas las taxonomías relacionadas con clasificación
    console.log('\n\n3. TAXONOMÍAS QUE PODRÍAN ESTAR RELACIONADAS CON CLASIFICACIÓN:');
    console.log('---------------------------------------------------------------');

    const [taxonomies] = await connection.execute(`
      SELECT DISTINCT
        tt.taxonomy,
        COUNT(*) as cantidad_terminos
      FROM wp_term_taxonomy tt
      WHERE tt.taxonomy LIKE '%clasif%'
         OR tt.taxonomy LIKE '%rating%'
         OR tt.taxonomy LIKE '%edad%'
         OR tt.taxonomy LIKE '%apto%'
      GROUP BY tt.taxonomy
    `);

    if (taxonomies.length > 0) {
      console.log('Taxonomías encontradas:');
      taxonomies.forEach(tax => {
        console.log(`- ${tax.taxonomy} (${tax.cantidad_terminos} términos)`);
      });
    } else {
      console.log('No se encontraron taxonomías específicas para clasificación.');
    }

    // 4. Analizar si hay relaciones entre posts y términos de clasificación
    console.log('\n\n4. ANÁLISIS DE POSTS CON CLASIFICACIÓN:');
    console.log('--------------------------------------');

    // Tomar una muestra de películas con clasificación
    const [sampleMovies] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        pm.meta_value as clasificacion
      FROM wp_posts p
      INNER JOIN wp_postmeta pm ON p.ID = pm.post_id
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND pm.meta_key = 'clasificacion'
        AND pm.meta_value IS NOT NULL
        AND pm.meta_value != ''
      LIMIT 5
    `);

    console.log('Muestra de películas con clasificación:');
    for (const movie of sampleMovies) {
      console.log(`\nPelícula: "${movie.post_title}"`);
      console.log(`  - ID: ${movie.ID}`);
      console.log(`  - Clasificación (meta): ${movie.clasificacion}`);
      
      // Verificar si tiene términos asociados
      const [movieTerms] = await connection.execute(`
        SELECT 
          t.name,
          t.slug,
          tt.taxonomy
        FROM wp_term_relationships tr
        INNER JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
        INNER JOIN wp_terms t ON tt.term_id = t.term_id
        WHERE tr.object_id = ?
          AND (tt.taxonomy LIKE '%clasif%' 
               OR tt.taxonomy LIKE '%rating%'
               OR t.name IN (SELECT DISTINCT meta_value FROM wp_postmeta WHERE meta_key = 'clasificacion'))
      `, [movie.ID]);

      if (movieTerms.length > 0) {
        console.log('  - Términos relacionados:');
        movieTerms.forEach(term => {
          console.log(`    • ${term.name} (${term.taxonomy})`);
        });
      }
    }

    // 5. Estadísticas generales
    console.log('\n\n5. ESTADÍSTICAS GENERALES:');
    console.log('--------------------------');

    const [totalMovies] = await connection.execute(`
      SELECT COUNT(*) as total
      FROM wp_posts
      WHERE post_type = 'pelicula'
        AND post_status = 'publish'
    `);

    const [moviesWithClassification] = await connection.execute(`
      SELECT COUNT(DISTINCT p.ID) as total
      FROM wp_posts p
      INNER JOIN wp_postmeta pm ON p.ID = pm.post_id
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND pm.meta_key = 'clasificacion'
        AND pm.meta_value IS NOT NULL
        AND pm.meta_value != ''
    `);

    console.log(`Total de películas: ${totalMovies[0].total}`);
    console.log(`Películas con clasificación: ${moviesWithClassification[0].total}`);
    console.log(`Porcentaje con clasificación: ${((moviesWithClassification[0].total / totalMovies[0].total) * 100).toFixed(2)}%`);

    // 6. Buscar todos los términos que podrían ser clasificaciones
    console.log('\n\n6. TODOS LOS TÉRMINOS QUE PODRÍAN SER CLASIFICACIONES:');
    console.log('----------------------------------------------------');

    const [allClassificationTerms] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.taxonomy,
        tt.count
      FROM wp_terms t
      INNER JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE t.name LIKE '%ATP%'
         OR t.name LIKE '%SAM%'
         OR t.name LIKE '%+%'
         OR t.name LIKE '%año%'
         OR t.name REGEXP '^[0-9]+$'
         OR t.slug LIKE '%atp%'
         OR t.slug LIKE '%sam%'
         OR t.slug LIKE '%clasif%'
         OR t.slug LIKE '%rating%'
      ORDER BY tt.taxonomy, t.name
    `);

    if (allClassificationTerms.length > 0) {
      console.log('Posibles términos de clasificación encontrados:');
      allClassificationTerms.forEach(term => {
        console.log(`- "${term.name}" (${term.taxonomy}) - usado ${term.count} veces`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Conexión cerrada');
    }
  }
}

// Ejecutar el análisis
analyzeClassification();