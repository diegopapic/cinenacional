const mysql = require('mysql2/promise');

// Configuración de la base de datos local WordPress
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wordpress_cine'
};

async function mapClassifications() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos WordPress local\n');

    console.log('=== MAPEO DE CLASIFICACIONES EN WORDPRESS ===\n');

    // 1. Analizar la relación entre valores numéricos y clasificaciones reales
    console.log('1. MAPEO DE VALORES NUMÉRICOS A CLASIFICACIONES OFICIALES:');
    console.log('----------------------------------------------------------');
    
    // Obtener películas que tengan tanto meta_value como términos de clasificación
    const [mappingData] = await connection.execute(`
      SELECT 
        pm.meta_value as codigo_meta,
        t.name as clasificacion_termino,
        t.slug as clasificacion_slug,
        COUNT(DISTINCT p.ID) as cantidad_peliculas
      FROM wp_posts p
      INNER JOIN wp_postmeta pm ON p.ID = pm.post_id
      INNER JOIN wp_term_relationships tr ON p.ID = tr.object_id
      INNER JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
      INNER JOIN wp_terms t ON tt.term_id = t.term_id
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND pm.meta_key = 'clasificacion'
        AND tt.taxonomy = 'clasificacion'
      GROUP BY pm.meta_value, t.name, t.slug
      ORDER BY 
        CASE 
          WHEN pm.meta_value REGEXP '^[0-9]+$' THEN CAST(pm.meta_value AS UNSIGNED)
          ELSE 999
        END,
        pm.meta_value,
        cantidad_peliculas DESC
    `);

    // Agrupar por código meta para ver todas las clasificaciones asociadas
    const codeMapping = {};
    mappingData.forEach(row => {
      if (!codeMapping[row.codigo_meta]) {
        codeMapping[row.codigo_meta] = [];
      }
      codeMapping[row.codigo_meta].push({
        clasificacion: row.clasificacion_termino,
        slug: row.clasificacion_slug,
        cantidad: row.cantidad_peliculas
      });
    });

    console.log('Mapeo encontrado:');
    Object.keys(codeMapping).forEach(code => {
      console.log(`\nCódigo "${code}":`);
      codeMapping[code].forEach(item => {
        console.log(`  → ${item.clasificacion} (${item.cantidad} películas)`);
      });
    });

    // 2. Analizar películas sin clasificación en la taxonomía
    console.log('\n\n2. PELÍCULAS SIN CLASIFICACIÓN EN TAXONOMÍA:');
    console.log('-------------------------------------------');
    
    const [moviesWithoutTaxonomy] = await connection.execute(`
      SELECT 
        pm.meta_value as codigo_meta,
        COUNT(DISTINCT p.ID) as cantidad
      FROM wp_posts p
      INNER JOIN wp_postmeta pm ON p.ID = pm.post_id
      LEFT JOIN (
        SELECT DISTINCT tr.object_id
        FROM wp_term_relationships tr
        INNER JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
        WHERE tt.taxonomy = 'clasificacion'
      ) tax ON p.ID = tax.object_id
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND pm.meta_key = 'clasificacion'
        AND pm.meta_value IS NOT NULL
        AND pm.meta_value != ''
        AND tax.object_id IS NULL
      GROUP BY pm.meta_value
      ORDER BY cantidad DESC
      LIMIT 20
    `);

    console.log('Códigos sin clasificación oficial:');
    moviesWithoutTaxonomy.forEach((row, index) => {
      console.log(`${index + 1}. Código "${row.codigo_meta}" - ${row.cantidad} películas sin clasificación oficial`);
    });

    // 3. Propuesta de mapeo basado en análisis
    console.log('\n\n3. PROPUESTA DE MAPEO SUGERIDO:');
    console.log('--------------------------------');
    
    // Analizar patrones comunes
    const [agePatterns] = await connection.execute(`
      SELECT 
        pm.meta_value,
        p.ID,
        p.post_title,
        p.post_date
      FROM wp_posts p
      INNER JOIN wp_postmeta pm ON p.ID = pm.post_id
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND pm.meta_key = 'clasificacion'
        AND pm.meta_value REGEXP '^[0-9]+$'
        AND CAST(pm.meta_value AS UNSIGNED) BETWEEN 10 AND 24
      ORDER BY CAST(pm.meta_value AS UNSIGNED), p.post_date
      LIMIT 5
    `);

    console.log('\nBasado en el análisis, posible interpretación de códigos numéricos:');
    console.log('(verificar con películas de muestra)\n');

    const suggestedMapping = {
      '1': 'ATP (posiblemente)',
      '2': 'ATP (posiblemente)',
      '4': 'ATP (posiblemente)',
      '13': 'SAM13',
      '14': 'SAM13 o SAM14',
      '15': 'SAM13 o SAM16',
      '16': 'SAM16',
      '18': 'SAM18',
      'ATP': 'ATP',
      'Inconveniente para menores de 14': 'SAM14',
      'Inconveniente para menores de 16': 'SAM16',
      'Inconveniente para menores de 18': 'SAM18',
      'Inconveniente para niños': 'SAM13',
      'No apta para menores de 14': 'SAM14',
      'Condicionada': 'C/R (Con Reservas)',
      'n/d': 'Sin clasificación'
    };

    Object.entries(suggestedMapping).forEach(([code, classification]) => {
      console.log(`- Código "${code}" → ${classification}`);
    });

    // 4. Verificación con películas específicas
    console.log('\n\n4. VERIFICACIÓN CON PELÍCULAS DE MUESTRA:');
    console.log('-----------------------------------------');

    // Tomar muestras de diferentes códigos
    const sampleCodes = ['1', '2', '13', '14', '16', '18', 'ATP'];
    
    for (const code of sampleCodes) {
      const [samples] = await connection.execute(`
        SELECT 
          p.ID,
          p.post_title,
          p.post_date,
          pm.meta_value as codigo_meta,
          GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ', ') as clasificaciones_taxonomia
        FROM wp_posts p
        INNER JOIN wp_postmeta pm ON p.ID = pm.post_id
        LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
        LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'clasificacion'
        LEFT JOIN wp_terms t ON tt.term_id = t.term_id
        WHERE p.post_type = 'pelicula'
          AND p.post_status = 'publish'
          AND pm.meta_key = 'clasificacion'
          AND pm.meta_value = ?
        GROUP BY p.ID
        ORDER BY p.post_date DESC
        LIMIT 3
      `, [code]);

      if (samples.length > 0) {
        console.log(`\nCódigo "${code}":`);
        samples.forEach(movie => {
          console.log(`  - "${movie.post_title}" (${movie.post_date.getFullYear()})`);
          console.log(`    Clasificación oficial: ${movie.clasificaciones_taxonomia || 'Sin clasificación'}`);
        });
      }
    }

    // 5. Resumen estadístico
    console.log('\n\n5. RESUMEN ESTADÍSTICO:');
    console.log('----------------------');

    const [stats] = await connection.execute(`
      SELECT 
        COUNT(DISTINCT p.ID) as total_peliculas,
        COUNT(DISTINCT CASE WHEN pm.meta_value = 'n/d' THEN p.ID END) as sin_clasificacion_meta,
        COUNT(DISTINCT CASE WHEN tax.object_id IS NOT NULL THEN p.ID END) as con_clasificacion_taxonomia,
        COUNT(DISTINCT CASE WHEN pm.meta_value != 'n/d' AND tax.object_id IS NULL THEN p.ID END) as solo_codigo_numerico
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'clasificacion'
      LEFT JOIN (
        SELECT DISTINCT tr.object_id
        FROM wp_term_relationships tr
        INNER JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
        WHERE tt.taxonomy = 'clasificacion'
      ) tax ON p.ID = tax.object_id
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
    `);

    const stat = stats[0];
    console.log(`Total de películas: ${stat.total_peliculas}`);
    console.log(`Sin clasificación (n/d): ${stat.sin_clasificacion_meta} (${((stat.sin_clasificacion_meta / stat.total_peliculas) * 100).toFixed(1)}%)`);
    console.log(`Con clasificación oficial (taxonomía): ${stat.con_clasificacion_taxonomia} (${((stat.con_clasificacion_taxonomia / stat.total_peliculas) * 100).toFixed(1)}%)`);
    console.log(`Solo código numérico sin taxonomía: ${stat.solo_codigo_numerico}`);

    // 6. Recomendación para migración
    console.log('\n\n6. RECOMENDACIÓN PARA MIGRACIÓN:');
    console.log('--------------------------------');
    console.log('1. Priorizar las clasificaciones de la taxonomía "clasificacion" (ATP, SAM13, etc.)');
    console.log('2. Para películas sin taxonomía, usar el mapeo sugerido de códigos numéricos');
    console.log('3. Considerar las películas con "n/d" como "Sin clasificación"');
    console.log('4. Normalizar todas las variantes textuales al sistema oficial argentino');
    console.log('5. Las variantes "C/R" indican "Con Reservas" y deberían preservarse');

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

// Ejecutar el mapeo
mapClassifications();