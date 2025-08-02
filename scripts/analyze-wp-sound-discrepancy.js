const mysql = require('mysql2/promise');

async function analyzeSoundDiscrepancy() {
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
    console.log('ANÁLISIS DE DISCREPANCIA EN DATOS DE SONIDO');
    console.log('='.repeat(70));

    // 1. Obtener todos los términos de la taxonomía "sonido"
    console.log('\n1. TÉRMINOS EN LA TAXONOMÍA "SONIDO":');
    console.log('-'.repeat(50));
    
    const [soundTerms] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.count
      FROM wp_terms t
      JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'sonido'
      ORDER BY t.term_id
    `);

    console.log('ID    | Nombre              | Slug                | Películas');
    console.log('-'.repeat(65));
    soundTerms.forEach(term => {
      console.log(
        `${term.term_id.toString().padEnd(5)} | ` +
        `${term.name.padEnd(19)} | ` +
        `${term.slug.padEnd(19)} | ` +
        `${term.count}`
      );
    });

    // 2. Comparar datos entre taxonomía y postmeta
    console.log('\n\n2. COMPARACIÓN ENTRE TAXONOMÍA Y POSTMETA:');
    console.log('-'.repeat(70));
    
    // Obtener una muestra de películas con diferentes valores en postmeta
    const postmetaValues = ['1', '2', '3'];
    
    for (const metaValue of postmetaValues) {
      console.log(`\nPelículas con meta_value = ${metaValue}:`);
      console.log('-'.repeat(50));
      
      const [movies] = await connection.execute(`
        SELECT 
          p.ID,
          p.post_title,
          pm.meta_value as postmeta_sound,
          GROUP_CONCAT(
            CASE WHEN tt.taxonomy = 'sonido' THEN t.name END
            SEPARATOR ', '
          ) as taxonomy_sound
        FROM wp_posts p
        JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'sonido'
        LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
        LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
        LEFT JOIN wp_terms t ON tt.term_id = t.term_id
        WHERE p.post_type = 'pelicula' 
        AND p.post_status = 'publish'
        AND pm.meta_value = ?
        GROUP BY p.ID, p.post_title, pm.meta_value
        LIMIT 5
      `, [metaValue]);

      movies.forEach(movie => {
        console.log(`ID: ${movie.ID}`);
        console.log(`Título: ${movie.post_title}`);
        console.log(`Sonido (postmeta): ${movie.postmeta_sound}`);
        console.log(`Sonido (taxonomía): ${movie.taxonomy_sound || 'NO ASIGNADO'}`);
        console.log('-'.repeat(30));
      });
    }

    // 3. Buscar películas sin valor en postmeta pero con taxonomía
    console.log('\n\n3. PELÍCULAS SIN VALOR EN POSTMETA PERO CON TAXONOMÍA:');
    console.log('-'.repeat(50));
    
    const [moviesWithTaxOnly] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        t.name as taxonomy_sound,
        pm.meta_value as postmeta_sound
      FROM wp_posts p
      JOIN wp_term_relationships tr ON p.ID = tr.object_id
      JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
      JOIN wp_terms t ON tt.term_id = t.term_id
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'sonido'
      WHERE p.post_type = 'pelicula' 
      AND p.post_status = 'publish'
      AND tt.taxonomy = 'sonido'
      AND (pm.meta_value IS NULL OR pm.meta_value = '')
      LIMIT 5
    `);

    if (moviesWithTaxOnly.length > 0) {
      moviesWithTaxOnly.forEach(movie => {
        console.log(`ID: ${movie.ID} - ${movie.post_title}`);
        console.log(`  Taxonomía: ${movie.taxonomy_sound}, Postmeta: ${movie.postmeta_sound || 'VACÍO'}`);
      });
    } else {
      console.log('No se encontraron películas con esta condición.');
    }

    // 4. Estadísticas de concordancia
    console.log('\n\n4. ESTADÍSTICAS DE CONCORDANCIA:');
    console.log('-'.repeat(50));

    const [concordanceStats] = await connection.execute(`
      SELECT 
        CASE 
          WHEN pm.meta_value = '3' AND t.name = 'Sonora' THEN 'Concordancia: 3=Sonora'
          WHEN pm.meta_value = '2' AND t.name = 'Muda' THEN 'Concordancia: 2=Muda'
          WHEN pm.meta_value = '1' AND t.name = 'Muda' THEN 'Concordancia: 1=Muda'
          WHEN pm.meta_value IS NOT NULL AND t.name IS NULL THEN 'Solo en postmeta'
          WHEN pm.meta_value IS NULL AND t.name IS NOT NULL THEN 'Solo en taxonomía'
          ELSE CONCAT('Discrepancia: meta=', IFNULL(pm.meta_value, 'NULL'), ', tax=', IFNULL(t.name, 'NULL'))
        END as status,
        COUNT(*) as count
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'sonido'
      LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
      LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'sonido'
      LEFT JOIN wp_terms t ON tt.term_id = t.term_id
      WHERE p.post_type = 'pelicula' 
      AND p.post_status = 'publish'
      GROUP BY status
      ORDER BY count DESC
    `);

    concordanceStats.forEach(stat => {
      console.log(`${stat.status.padEnd(40)} | ${stat.count} películas`);
    });

    // 5. Buscar si hay un tercer término de sonido
    console.log('\n\n5. BÚSQUEDA DE POSIBLE TERCER TIPO DE SONIDO:');
    console.log('-'.repeat(50));

    // Buscar términos relacionados con "desconocido", "sin sonido", etc.
    const [unknownSoundTerms] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.taxonomy,
        tt.count
      FROM wp_terms t
      JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE (
        t.name LIKE '%desconoc%' OR 
        t.name LIKE '%sin%' OR
        t.name LIKE '%unknown%' OR
        t.name LIKE '%no %' OR
        t.slug LIKE '%desconoc%' OR
        t.slug LIKE '%unknown%'
      )
      AND tt.taxonomy IN ('sonido', 'category', 'post_tag')
      ORDER BY tt.taxonomy, t.name
    `);

    if (unknownSoundTerms.length > 0) {
      console.log('Posibles términos para el tercer tipo:');
      unknownSoundTerms.forEach(term => {
        console.log(`- ${term.taxonomy}: "${term.name}" (ID: ${term.term_id}, slug: ${term.slug})`);
      });
    } else {
      console.log('No se encontraron términos que podrían representar "Desconocido"');
    }

    // 6. Mapeo sugerido
    console.log('\n\n6. MAPEO SUGERIDO BASADO EN EL ANÁLISIS:');
    console.log('-'.repeat(50));
    console.log('Basado en los datos analizados:');
    console.log('- PostMeta valor "3" = Sonora (10,390 películas)');
    console.log('- PostMeta valor "2" = Posiblemente Muda (172 películas)');
    console.log('- PostMeta valor "1" = Desconocido o Sin clasificar (20 películas)');
    console.log('\nNOTA: El sistema parece usar principalmente PostMeta, no la taxonomía.');

  } catch (error) {
    console.error('Error al analizar la discrepancia de sonido:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n\nConexión cerrada');
    }
  }
}

// Ejecutar el análisis
analyzeSoundDiscrepancy();