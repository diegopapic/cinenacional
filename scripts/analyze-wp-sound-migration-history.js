const mysql = require('mysql2/promise');

async function analyzeMigrationHistory() {
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
    console.log('ANÁLISIS HISTÓRICO DE LA MIGRACIÓN DE SONIDO');
    console.log('='.repeat(70));

    // 1. Analizar distribución temporal de películas con cada sistema
    console.log('\n1. DISTRIBUCIÓN TEMPORAL POR SISTEMA:');
    console.log('-'.repeat(50));
    
    const [temporalDistribution] = await connection.execute(`
      SELECT 
        YEAR(p.post_date) as year,
        CASE 
          WHEN pm.meta_value IS NOT NULL AND t.name IS NULL THEN 'Solo PostMeta'
          WHEN pm.meta_value IS NULL AND t.name IS NOT NULL THEN 'Solo Taxonomía'
          WHEN pm.meta_value IS NOT NULL AND t.name IS NOT NULL THEN 'Ambos sistemas'
          ELSE 'Sin datos de sonido'
        END as system_type,
        COUNT(*) as count
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'sonido'
      LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
      LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'sonido'
      LEFT JOIN wp_terms t ON tt.term_id = t.term_id
      WHERE p.post_type = 'pelicula' 
      AND p.post_status = 'publish'
      AND YEAR(p.post_date) >= 2000
      GROUP BY YEAR(p.post_date), system_type
      ORDER BY year, system_type
    `);

    let currentYear = null;
    temporalDistribution.forEach(row => {
      if (row.year !== currentYear) {
        console.log(`\n${row.year}:`);
        currentYear = row.year;
      }
      console.log(`  ${row.system_type.padEnd(20)} | ${row.count} películas`);
    });

    // 2. Encontrar el punto de corte temporal
    console.log('\n\n2. PRIMERA Y ÚLTIMA PELÍCULA DE CADA SISTEMA:');
    console.log('-'.repeat(50));

    // Primera y última película solo con PostMeta
    const [postmetaOnly] = await connection.execute(`
      SELECT 
        'PostMeta Only' as system,
        MIN(p.post_date) as first_date,
        MAX(p.post_date) as last_date,
        COUNT(*) as total
      FROM wp_posts p
      JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'sonido'
      LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
      LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'sonido'
      WHERE p.post_type = 'pelicula' 
      AND p.post_status = 'publish'
      AND pm.meta_value IS NOT NULL
      AND tt.term_taxonomy_id IS NULL
    `);

    // Primera y última película solo con Taxonomía
    const [taxonomyOnly] = await connection.execute(`
      SELECT 
        'Taxonomy Only' as system,
        MIN(p.post_date) as first_date,
        MAX(p.post_date) as last_date,
        COUNT(*) as total
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'sonido'
      JOIN wp_term_relationships tr ON p.ID = tr.object_id
      JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'sonido'
      WHERE p.post_type = 'pelicula' 
      AND p.post_status = 'publish'
      AND (pm.meta_value IS NULL OR pm.meta_value = '')
    `);

    // Primera y última película con ambos sistemas
    const [bothSystems] = await connection.execute(`
      SELECT 
        'Both Systems' as system,
        MIN(p.post_date) as first_date,
        MAX(p.post_date) as last_date,
        COUNT(*) as total
      FROM wp_posts p
      JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'sonido'
      JOIN wp_term_relationships tr ON p.ID = tr.object_id
      JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'sonido'
      WHERE p.post_type = 'pelicula' 
      AND p.post_status = 'publish'
      AND pm.meta_value IS NOT NULL
    `);

    const allSystems = [...postmetaOnly, ...taxonomyOnly, ...bothSystems];
    
    console.log('Sistema          | Primera película    | Última película     | Total');
    console.log('-'.repeat(70));
    allSystems.forEach(sys => {
      if (sys.total > 0) {
        console.log(
          `${sys.system.padEnd(16)} | ` +
          `${sys.first_date?.toISOString().split('T')[0] || 'N/A'} | ` +
          `${sys.last_date?.toISOString().split('T')[0] || 'N/A'} | ` +
          `${sys.total}`
        );
      }
    });

    // 3. Analizar IDs de posts para detectar importación masiva
    console.log('\n\n3. ANÁLISIS DE IDs DE POSTS (POSIBLE IMPORTACIÓN MASIVA):');
    console.log('-'.repeat(50));

    const [idRanges] = await connection.execute(`
      SELECT 
        CASE 
          WHEN pm.meta_value IS NOT NULL AND tt.term_taxonomy_id IS NULL THEN 'Solo PostMeta'
          WHEN pm.meta_value IS NULL AND tt.term_taxonomy_id IS NOT NULL THEN 'Solo Taxonomía'
          WHEN pm.meta_value IS NOT NULL AND tt.term_taxonomy_id IS NOT NULL THEN 'Ambos sistemas'
        END as system_type,
        MIN(p.ID) as min_id,
        MAX(p.ID) as max_id,
        COUNT(*) as count
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'sonido'
      LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
      LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'sonido'
      WHERE p.post_type = 'pelicula' 
      AND p.post_status = 'publish'
      AND (pm.meta_value IS NOT NULL OR tt.term_taxonomy_id IS NOT NULL)
      GROUP BY system_type
      HAVING system_type IS NOT NULL
    `);

    console.log('Sistema          | ID Mínimo | ID Máximo | Cantidad');
    console.log('-'.repeat(55));
    idRanges.forEach(range => {
      console.log(
        `${range.system_type.padEnd(16)} | ` +
        `${range.min_id.toString().padEnd(9)} | ` +
        `${range.max_id.toString().padEnd(9)} | ` +
        `${range.count}`
      );
    });

    // 4. Verificar patrones en post_modified
    console.log('\n\n4. ANÁLISIS DE FECHAS DE MODIFICACIÓN:');
    console.log('-'.repeat(50));

    const [modificationPatterns] = await connection.execute(`
      SELECT 
        CASE 
          WHEN p.post_date = p.post_modified THEN 'Nunca modificado'
          ELSE 'Modificado después'
        END as modification_status,
        CASE 
          WHEN pm.meta_value IS NOT NULL AND tt.term_taxonomy_id IS NULL THEN 'Solo PostMeta'
          WHEN pm.meta_value IS NULL AND tt.term_taxonomy_id IS NOT NULL THEN 'Solo Taxonomía'
          WHEN pm.meta_value IS NOT NULL AND tt.term_taxonomy_id IS NOT NULL THEN 'Ambos sistemas'
        END as system_type,
        COUNT(*) as count
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'sonido'
      LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
      LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'sonido'
      WHERE p.post_type = 'pelicula' 
      AND p.post_status = 'publish'
      AND (pm.meta_value IS NOT NULL OR tt.term_taxonomy_id IS NOT NULL)
      GROUP BY modification_status, system_type
      ORDER BY system_type, modification_status
    `);

    let currentSystem = null;
    modificationPatterns.forEach(pattern => {
      if (pattern.system_type !== currentSystem) {
        console.log(`\n${pattern.system_type}:`);
        currentSystem = pattern.system_type;
      }
      console.log(`  ${pattern.modification_status}: ${pattern.count} películas`);
    });

    // 5. Buscar patrones en los autores
    console.log('\n\n5. ANÁLISIS POR AUTOR (post_author):');
    console.log('-'.repeat(50));

    const [authorPatterns] = await connection.execute(`
      SELECT 
        p.post_author,
        u.display_name,
        CASE 
          WHEN pm.meta_value IS NOT NULL AND tt.term_taxonomy_id IS NULL THEN 'Solo PostMeta'
          WHEN pm.meta_value IS NULL AND tt.term_taxonomy_id IS NOT NULL THEN 'Solo Taxonomía'
          WHEN pm.meta_value IS NOT NULL AND tt.term_taxonomy_id IS NOT NULL THEN 'Ambos sistemas'
        END as system_type,
        COUNT(*) as count
      FROM wp_posts p
      LEFT JOIN wp_users u ON p.post_author = u.ID
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = 'sonido'
      LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
      LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'sonido'
      WHERE p.post_type = 'pelicula' 
      AND p.post_status = 'publish'
      AND (pm.meta_value IS NOT NULL OR tt.term_taxonomy_id IS NOT NULL)
      GROUP BY p.post_author, u.display_name, system_type
      HAVING count > 10
      ORDER BY count DESC
      LIMIT 10
    `);

    console.log('Autor               | Sistema         | Películas');
    console.log('-'.repeat(55));
    authorPatterns.forEach(author => {
      const displayName = author.display_name || `User ID ${author.post_author}`;
      console.log(
        `${displayName.substring(0, 18).padEnd(18)} | ` +
        `${author.system_type.padEnd(15)} | ` +
        `${author.count}`
      );
    });

    console.log('\n\n6. CONCLUSIÓN:');
    console.log('-'.repeat(50));
    console.log('El análisis sugiere que hubo una migración masiva donde:');
    console.log('- Las películas antiguas usan solo PostMeta (sistema pre-WordPress)');
    console.log('- Las películas nuevas usan Taxonomía (sistema WordPress nativo)');
    console.log('- Algunas películas tienen ambos (posiblemente actualizadas post-migración)');

  } catch (error) {
    console.error('Error al analizar el historial de migración:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n\nConexión cerrada');
    }
  }
}

// Ejecutar el análisis
analyzeMigrationHistory();