const mysql = require('mysql2/promise');

// Configuración de la base de datos local WordPress
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wordpress_cine'
};

async function deepAnalyzeClassifications() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos WordPress local\n');

    console.log('=== ANÁLISIS PROFUNDO DE CLASIFICACIONES ===\n');

    // 1. Buscar TODAS las meta keys que podrían contener clasificación
    console.log('1. BÚSQUEDA DE TODAS LAS POSIBLES META KEYS DE CLASIFICACIÓN:');
    console.log('------------------------------------------------------------');
    
    const movieIds = [848, 6531]; // Las Furias y Relatos Salvajes
    
    const [allMetaKeys] = await connection.execute(`
      SELECT DISTINCT 
        pm.meta_key,
        COUNT(DISTINCT pm.post_id) as cantidad_posts
      FROM wp_postmeta pm
      INNER JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND (
          pm.meta_key LIKE '%clasif%'
          OR pm.meta_key LIKE '%rating%'
          OR pm.meta_key LIKE '%edad%'
          OR pm.meta_key LIKE '%apto%'
          OR pm.meta_key LIKE '%sam%'
          OR pm.meta_key LIKE '%atp%'
        )
      GROUP BY pm.meta_key
      ORDER BY cantidad_posts DESC
    `);

    console.log('Meta keys encontradas relacionadas con clasificación:');
    allMetaKeys.forEach(key => {
      console.log(`- ${key.meta_key}: ${key.cantidad_posts} películas`);
    });

    // 2. Analizar casos específicos con TODOS los metadatos
    console.log('\n\n2. ANÁLISIS COMPLETO DE PELÍCULAS ESPECÍFICAS:');
    console.log('----------------------------------------------');
    
    for (const movieId of movieIds) {
      const [movieData] = await connection.execute(`
        SELECT 
          p.ID,
          p.post_title,
          p.post_date
        FROM wp_posts p
        WHERE p.ID = ?
      `, [movieId]);

      if (movieData.length > 0) {
        const movie = movieData[0];
        console.log(`\n"${movie.post_title}" (ID: ${movie.ID}):`);
        
        // Obtener TODOS los metadatos
        const [allMeta] = await connection.execute(`
          SELECT 
            meta_key,
            meta_value
          FROM wp_postmeta
          WHERE post_id = ?
            AND (
              meta_key LIKE '%clasif%'
              OR meta_key LIKE '%rating%'
              OR meta_key LIKE '%edad%'
              OR meta_key LIKE '%apto%'
              OR meta_key LIKE '%sam%'
              OR meta_key LIKE '%atp%'
              OR meta_key = 'clasificacion'
            )
          ORDER BY meta_key
        `, [movieId]);

        console.log('Metadatos relacionados con clasificación:');
        allMeta.forEach(meta => {
          console.log(`  - ${meta.meta_key}: "${meta.meta_value}"`);
        });

        // Obtener TODOS los términos de TODAS las taxonomías
        const [allTerms] = await connection.execute(`
          SELECT 
            t.term_id,
            t.name,
            t.slug,
            tt.taxonomy,
            tt.description
          FROM wp_term_relationships tr
          INNER JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
          INNER JOIN wp_terms t ON tt.term_id = t.term_id
          WHERE tr.object_id = ?
          ORDER BY tt.taxonomy, t.name
        `, [movieId]);

        console.log('\nTodos los términos asociados:');
        allTerms.forEach(term => {
          console.log(`  - [${term.taxonomy}] ${term.name} (${term.slug})`);
        });
      }
    }

    // 3. Buscar si hay algún campo ACF o serializado
    console.log('\n\n3. BÚSQUEDA DE CAMPOS ACF O DATOS SERIALIZADOS:');
    console.log('-----------------------------------------------');
    
    const [acfFields] = await connection.execute(`
      SELECT DISTINCT
        pm.meta_key,
        pm.meta_value
      FROM wp_postmeta pm
      WHERE (pm.meta_key LIKE '_clasificacion%' 
          OR pm.meta_key LIKE 'field_%'
          OR pm.meta_value LIKE '%clasificacion%')
        AND pm.post_id IN (SELECT ID FROM wp_posts WHERE post_type = 'pelicula')
      LIMIT 20
    `);

    if (acfFields.length > 0) {
      console.log('Posibles campos ACF encontrados:');
      acfFields.forEach(field => {
        console.log(`- ${field.meta_key}: ${field.meta_value.substring(0, 100)}...`);
      });
    } else {
      console.log('No se encontraron campos ACF relacionados.');
    }

    // 4. Verificar si el código 14 realmente corresponde a SAM16
    console.log('\n\n4. VERIFICACIÓN DEL MAPEO CÓDIGO 14:');
    console.log('------------------------------------');
    
    const [code14Movies] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        pm_year.meta_value as ano,
        pm_class.meta_value as codigo_clasificacion,
        GROUP_CONCAT(DISTINCT CONCAT(t.name, ' (', tt.taxonomy, ')') ORDER BY t.name SEPARATOR ' | ') as todos_terminos
      FROM wp_posts p
      INNER JOIN wp_postmeta pm_class ON p.ID = pm_class.post_id AND pm_class.meta_key = 'clasificacion'
      LEFT JOIN wp_postmeta pm_year ON p.ID = pm_year.post_id AND pm_year.meta_key = 'ano'
      LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
      LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
      LEFT JOIN wp_terms t ON tt.term_id = t.term_id
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND pm_class.meta_value = '14'
      GROUP BY p.ID
      ORDER BY p.post_date DESC
      LIMIT 10
    `);

    console.log('Muestra de películas con código 14:');
    code14Movies.forEach(movie => {
      console.log(`\n- "${movie.post_title}" (${movie.ano})`);
      console.log(`  Términos: ${movie.todos_terminos || 'Sin términos'}`);
    });

    // 5. Buscar el patrón de importación
    console.log('\n\n5. ANÁLISIS DE PATRONES DE IMPORTACIÓN:');
    console.log('--------------------------------------');
    
    const [importPatterns] = await connection.execute(`
      SELECT 
        YEAR(p.post_date) as year_import,
        pm.meta_value as codigo,
        COUNT(DISTINCT p.ID) as cantidad,
        GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ', ') as clasificaciones_usadas
      FROM wp_posts p
      INNER JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'clasificacion'
      LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
      LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'clasificacion'
      LEFT JOIN wp_terms t ON tt.term_id = t.term_id
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND pm.meta_value IN ('14', '19')
      GROUP BY YEAR(p.post_date), pm.meta_value
      ORDER BY year_import DESC, codigo
    `);

    console.log('Patrón de importación por año:');
    console.log('Año  | Código | Cantidad | Clasificaciones en taxonomía');
    console.log('-----|--------|----------|------------------------------');
    importPatterns.forEach(pattern => {
      console.log(`${pattern.year_import} | ${pattern.codigo.padEnd(6)} | ${pattern.cantidad.toString().padEnd(8)} | ${pattern.clasificaciones_usadas || 'Sin clasificación'}`);
    });

    // 6. Propuesta de mapeo corregida
    console.log('\n\n6. PROPUESTA DE MAPEO CORREGIDA:');
    console.log('--------------------------------');
    
    console.log('\nBasándome en el análisis, el mapeo correcto parece ser:');
    console.log('- Código 14 → "Prohibida para menores de 18" (histórico) → SAM18');
    console.log('- Código 19 → SAM16');
    console.log('- Las clasificaciones en el admin podrían estar siendo procesadas por algún plugin');
    console.log('\nRecomendación: Verificar en el código PHP del tema o plugins si hay alguna');
    console.log('función que procese las clasificaciones antes de mostrarlas en el admin.');

    // 7. Query final para verificar
    console.log('\n\n7. VERIFICACIÓN FINAL - TODAS LAS FORMAS DE CLASIFICACIÓN:');
    console.log('---------------------------------------------------------');
    
    const testMovieTitle = 'Las Furias';
    const [finalCheck] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        pm1.meta_value as clasificacion,
        pm2.meta_value as _clasificacion,
        pm3.meta_value as rating,
        pm4.meta_value as _rating,
        GROUP_CONCAT(DISTINCT CONCAT(pm.meta_key, '=', pm.meta_value) SEPARATOR ' | ') as otros_meta
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm1 ON p.ID = pm1.post_id AND pm1.meta_key = 'clasificacion'
      LEFT JOIN wp_postmeta pm2 ON p.ID = pm2.post_id AND pm2.meta_key = '_clasificacion'
      LEFT JOIN wp_postmeta pm3 ON p.ID = pm3.post_id AND pm3.meta_key = 'rating'
      LEFT JOIN wp_postmeta pm4 ON p.ID = pm4.post_id AND pm4.meta_key = '_rating'
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id 
        AND pm.meta_key NOT IN ('clasificacion', '_clasificacion', 'rating', '_rating')
        AND (pm.meta_key LIKE '%clasif%' OR pm.meta_key LIKE '%rating%' OR pm.meta_key LIKE '%edad%')
      WHERE p.post_title LIKE ?
        AND p.post_type = 'pelicula'
      GROUP BY p.ID
    `, [`%${testMovieTitle}%`]);

    console.log(`\nTodas las formas de clasificación para "${testMovieTitle}":`);
    finalCheck.forEach(movie => {
      console.log(`ID: ${movie.ID}`);
      console.log(`- clasificacion: ${movie.clasificacion}`);
      console.log(`- _clasificacion: ${movie._clasificacion}`);
      console.log(`- rating: ${movie.rating}`);
      console.log(`- _rating: ${movie._rating}`);
      if (movie.otros_meta) {
        console.log(`- Otros meta: ${movie.otros_meta}`);
      }
    });

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

// Ejecutar el análisis profundo
deepAnalyzeClassifications();