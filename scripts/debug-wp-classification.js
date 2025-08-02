const mysql = require('mysql2/promise');

// Configuración de la base de datos local WordPress
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wordpress_cine'
};

async function debugClassifications() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos WordPress local\n');

    console.log('=== DEBUG DE CLASIFICACIONES - CASOS ESPECÍFICOS ===\n');

    // 1. Verificar el caso de "Las Furias"
    console.log('1. CASO ESPECÍFICO: "Las Furias"');
    console.log('--------------------------------');
    
    const [lasFurias] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        p.post_date,
        p.post_modified,
        pm_year.meta_value as ano,
        pm_class.meta_value as clasificacion_meta,
        GROUP_CONCAT(DISTINCT CONCAT(t.name, ' (', tt.taxonomy, ')') ORDER BY t.name SEPARATOR ' | ') as terminos
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm_year ON p.ID = pm_year.post_id AND pm_year.meta_key = 'ano'
      LEFT JOIN wp_postmeta pm_class ON p.ID = pm_class.post_id AND pm_class.meta_key = 'clasificacion'
      LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
      LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
      LEFT JOIN wp_terms t ON tt.term_id = t.term_id
      WHERE p.post_type = 'pelicula'
        AND p.post_title LIKE '%Las Furias%'
      GROUP BY p.ID
    `);

    lasFurias.forEach(movie => {
      console.log(`ID: ${movie.ID}`);
      console.log(`Título: ${movie.post_title}`);
      console.log(`Año (meta): ${movie.ano}`);
      console.log(`Fecha publicación: ${movie.post_date}`);
      console.log(`Clasificación (meta): ${movie.clasificacion_meta}`);
      console.log(`Términos asociados: ${movie.terminos || 'Sin términos'}`);
      console.log('---');
    });

    // 2. Verificar el mapeo real código -> clasificación
    console.log('\n\n2. MAPEO REAL VERIFICADO CON PELÍCULAS CONOCIDAS:');
    console.log('------------------------------------------------');
    
    // Buscar películas que sabemos tienen clasificación específica
    const knownMovies = [
      { title: 'Las Furias', expectedClass: 'SAM16' },
      { title: 'El secreto de sus ojos', expectedClass: 'SAM13' },
      { title: 'Relatos salvajes', expectedClass: 'SAM16' }
    ];

    for (const known of knownMovies) {
      const [results] = await connection.execute(`
        SELECT 
          p.ID,
          p.post_title,
          pm_year.meta_value as ano,
          pm_class.meta_value as codigo_meta,
          GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ', ') as clasificaciones_taxonomia
        FROM wp_posts p
        LEFT JOIN wp_postmeta pm_year ON p.ID = pm_year.post_id AND pm_year.meta_key = 'ano'
        LEFT JOIN wp_postmeta pm_class ON p.ID = pm_class.post_id AND pm_class.meta_key = 'clasificacion'
        LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
        LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'clasificacion'
        LEFT JOIN wp_terms t ON tt.term_id = t.term_id
        WHERE p.post_type = 'pelicula'
          AND p.post_status = 'publish'
          AND p.post_title LIKE ?
        GROUP BY p.ID
        ORDER BY p.post_date DESC
      `, [`%${known.title}%`]);

      if (results.length > 0) {
        console.log(`\n"${known.title}" (esperada: ${known.expectedClass}):`);
        results.forEach(movie => {
          console.log(`  - ID: ${movie.ID}, Año: ${movie.ano}`);
          console.log(`    Código meta: "${movie.codigo_meta}"`);
          console.log(`    Clasificación taxonomía: ${movie.clasificaciones_taxonomia || 'Sin clasificación'}`);
        });
      }
    }

    // 3. Analizar el mapeo completo con validación
    console.log('\n\n3. MAPEO DEFINITIVO BASADO EN DATOS REALES:');
    console.log('-------------------------------------------');
    
    const [definitiveMapping] = await connection.execute(`
      SELECT 
        pm.meta_value as codigo,
        t.name as clasificacion_oficial,
        COUNT(DISTINCT p.ID) as total_peliculas,
        MIN(YEAR(p.post_date)) as desde_ano,
        MAX(YEAR(p.post_date)) as hasta_ano
      FROM wp_posts p
      INNER JOIN wp_postmeta pm ON p.ID = pm.post_id
      INNER JOIN wp_term_relationships tr ON p.ID = tr.object_id
      INNER JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
      INNER JOIN wp_terms t ON tt.term_id = t.term_id
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND pm.meta_key = 'clasificacion'
        AND tt.taxonomy = 'clasificacion'
        AND pm.meta_value REGEXP '^[0-9]+$'
      GROUP BY pm.meta_value, t.name
      HAVING total_peliculas >= 10
      ORDER BY 
        CAST(pm.meta_value AS UNSIGNED),
        total_peliculas DESC
    `);

    console.log('\nMapeo definitivo (mínimo 10 películas por relación):');
    console.log('Código | Clasificación Oficial | Películas | Período');
    console.log('-------|----------------------|-----------|----------');
    definitiveMapping.forEach(map => {
      console.log(`${map.codigo.padEnd(6)} | ${map.clasificacion_oficial.padEnd(20)} | ${map.total_peliculas.toString().padEnd(9)} | ${map.desde_ano}-${map.hasta_ano}`);
    });

    // 4. Crear tabla de mapeo final
    console.log('\n\n4. TABLA DE MAPEO FINAL RECOMENDADA:');
    console.log('------------------------------------');
    
    const finalMapping = {
      // Basado en el análisis real
      '1': null,  // Sin datos suficientes
      '2': 'ATP',
      '3': null,  // Sin datos suficientes
      '4': 'Inconveniente para menores de 14',
      '5': 'Inconveniente para menores de 16',
      '6': 'Inconveniente para menores de 18',
      '7': 'Inconveniente para niños',
      '8': 'No apta para menores de 14',
      '9': 'No apta para menores de 16',
      '10': 'No apta para menores de 18',
      '11': 'Prohibida para menores de 13',
      '12': 'Prohibida para menores de 14',
      '13': 'Prohibida para menores de 16',
      '14': 'Prohibida para menores de 18',
      '15': 'SAM13',
      '16': 'SAM13 C/R',
      '17': 'SAM14',
      '18': 'SAM15',
      '19': 'SAM16',
      '20': 'SAM16 C/R',
      '21': 'SAM18',
      '22': 'SAM18 C/R',
      '23': 'Sin restricciones',  // Podría ser ATP
      '24': 'ATP C/R',
      'n/d': null,  // Sin clasificación conocida
    };

    console.log('\nMapeo final para migración:');
    Object.entries(finalMapping).forEach(([code, classification]) => {
      console.log(`Código "${code}" → ${classification || 'NULL (sin clasificación conocida)'}`);
    });

    // 5. Verificar casos sin clasificación
    console.log('\n\n5. ANÁLISIS DE PELÍCULAS SIN CLASIFICACIÓN:');
    console.log('------------------------------------------');
    
    const [noClassStats] = await connection.execute(`
      SELECT 
        CASE 
          WHEN pm.meta_value = 'n/d' THEN '"n/d" (no disponible)'
          WHEN pm.meta_value IS NULL OR pm.meta_value = '' THEN 'NULL o vacío'
          ELSE 'Otro valor'
        END as tipo,
        COUNT(*) as cantidad
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'clasificacion'
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND (pm.meta_value = 'n/d' OR pm.meta_value IS NULL OR pm.meta_value = '')
      GROUP BY tipo
    `);

    console.log('Películas sin clasificación conocida:');
    noClassStats.forEach(stat => {
      console.log(`- ${stat.tipo}: ${stat.cantidad} películas`);
    });

    // 6. Sugerencia de normalización
    console.log('\n\n6. NORMALIZACIÓN SUGERIDA PARA SUPABASE:');
    console.log('---------------------------------------');
    console.log('Sistema de clasificación argentino actual (INCAA):');
    console.log('- ATP: Apto para Todo Público');
    console.log('- SAM13: Solo Apto para Mayores de 13 años');
    console.log('- SAM16: Solo Apto para Mayores de 16 años');
    console.log('- SAM18: Solo Apto para Mayores de 18 años');
    console.log('- C/R: Con Reservas (se agrega al final)');
    console.log('\nClasificaciones históricas a normalizar:');
    console.log('- "Inconveniente para..." → Mapear según edad');
    console.log('- "No apta para..." → Mapear según edad');
    console.log('- "Prohibida para..." → Mapear según edad');
    console.log('- "Sin restricciones" → ATP');
    console.log('- "n/d" o NULL → dejar campo vacío (no "Sin clasificación")');

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

// Ejecutar el debug
debugClassifications();