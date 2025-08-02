const mysql = require('mysql2/promise');

async function analyzeCoproduction() {
  // Configuración de conexión a la base de datos local de WordPress
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Ajustar según tu configuración local
    database: 'wordpress_cine'
  });

  try {
    console.log('=== ANÁLISIS DE PAÍSES COPRODUCTORES EN WORDPRESS ===\n');

    // 1. Contar cuántas películas tienen información de coproducción
    const [moviesWithCoproduction] = await connection.execute(`
      SELECT COUNT(DISTINCT pm.post_id) as total
      FROM wp_postmeta pm
      WHERE pm.meta_key = 'coproduccion'
      AND pm.meta_value != ''
      AND pm.meta_value IS NOT NULL
    `);
    
    console.log(`Total de películas con información de coproducción: ${moviesWithCoproduction[0].total}\n`);

    // 2. Obtener una muestra de valores de coproducción
    console.log('=== MUESTRA DE VALORES DE COPRODUCCIÓN ===');
    const [coproductionSample] = await connection.execute(`
      SELECT 
        pm.post_id,
        p.post_title as movie_title,
        pm.meta_value as coproduction_value
      FROM wp_postmeta pm
      JOIN wp_posts p ON p.ID = pm.post_id
      WHERE pm.meta_key = 'coproduccion'
      AND pm.meta_value != ''
      AND pm.meta_value IS NOT NULL
      AND p.post_type = 'pelicula'
      AND p.post_status = 'publish'
      LIMIT 20
    `);

    coproductionSample.forEach((row, index) => {
      console.log(`\n${index + 1}. Película: ${row.movie_title}`);
      console.log(`   Post ID: ${row.post_id}`);
      console.log(`   Valor coproducción: "${row.coproduction_value}"`);
    });

    // 3. Analizar el formato de los valores (serializado, JSON, texto plano, etc.)
    console.log('\n\n=== ANÁLISIS DE FORMATO DE VALORES ===');
    const [allCoproductionValues] = await connection.execute(`
      SELECT meta_value
      FROM wp_postmeta
      WHERE meta_key = 'coproduccion'
      AND meta_value != ''
      AND meta_value IS NOT NULL
      LIMIT 100
    `);

    let serializedCount = 0;
    let jsonCount = 0;
    let plainTextCount = 0;
    let numericCount = 0;
    let otherCount = 0;

    allCoproductionValues.forEach(row => {
      const value = row.meta_value;
      
      // Verificar si es un array PHP serializado
      if (value.startsWith('a:') && value.includes(':{')) {
        serializedCount++;
      }
      // Verificar si es JSON
      else if ((value.startsWith('[') && value.endsWith(']')) || 
               (value.startsWith('{') && value.endsWith('}'))) {
        try {
          JSON.parse(value);
          jsonCount++;
        } catch {
          plainTextCount++;
        }
      }
      // Verificar si es numérico
      else if (!isNaN(value)) {
        numericCount++;
      }
      // Texto plano
      else {
        plainTextCount++;
      }
    });

    console.log(`Valores serializados (PHP): ${serializedCount}`);
    console.log(`Valores JSON: ${jsonCount}`);
    console.log(`Valores numéricos: ${numericCount}`);
    console.log(`Valores de texto plano: ${plainTextCount}`);
    console.log(`Otros formatos: ${otherCount}`);

    // 4. Obtener los países disponibles en wp_terms
    console.log('\n\n=== PAÍSES DISPONIBLES EN WP_TERMS ===');
    const [countries] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.taxonomy,
        tt.count
      FROM wp_terms t
      JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'pais'
      ORDER BY t.name
    `);

    console.log(`\nTotal de países en la taxonomía: ${countries.length}\n`);
    
    console.log('Lista de países disponibles:');
    countries.forEach(country => {
      console.log(`- ID: ${country.term_id}, Nombre: ${country.name}, Slug: ${country.slug}, Películas: ${country.count}`);
    });

    // 5. Analizar relación entre coproducción y términos de país
    console.log('\n\n=== ANÁLISIS DE RELACIÓN COPRODUCCIÓN-PAÍSES ===');
    
    // Si los valores son numéricos, intentar relacionarlos con term_id
    if (numericCount > 0) {
      const [numericCoproduction] = await connection.execute(`
        SELECT 
          pm.post_id,
          p.post_title,
          pm.meta_value as country_id,
          t.name as country_name,
          t.slug as country_slug
        FROM wp_postmeta pm
        JOIN wp_posts p ON p.ID = pm.post_id
        LEFT JOIN wp_terms t ON t.term_id = pm.meta_value
        WHERE pm.meta_key = 'coproduccion'
        AND pm.meta_value REGEXP '^[0-9]+$'
        AND p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        LIMIT 10
      `);

      console.log('\nMuestra de coproducciones con valores numéricos:');
      numericCoproduction.forEach(row => {
        console.log(`- Película: ${row.post_title}`);
        console.log(`  Country ID: ${row.country_id} => ${row.country_name || 'NO ENCONTRADO'}`);
      });
    }

    // 6. Buscar películas con múltiples países coproductores
    console.log('\n\n=== PELÍCULAS CON MÚLTIPLES COPRODUCTORES ===');
    
    // Primero, analicemos si hay valores serializados
    if (serializedCount > 0) {
      const [serializedSample] = await connection.execute(`
        SELECT 
          pm.post_id,
          p.post_title,
          pm.meta_value
        FROM wp_postmeta pm
        JOIN wp_posts p ON p.ID = pm.post_id
        WHERE pm.meta_key = 'coproduccion'
        AND pm.meta_value LIKE 'a:%'
        AND p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        LIMIT 5
      `);

      console.log('\nMuestra de valores serializados:');
      serializedSample.forEach(row => {
        console.log(`\n- Película: ${row.post_title}`);
        console.log(`  Valor serializado: ${row.meta_value}`);
        
        // Intentar deserializar con una función simple
        try {
          const matches = row.meta_value.match(/s:\d+:"([^"]+)"/g);
          if (matches) {
            console.log('  Valores extraídos:');
            matches.forEach(match => {
              const value = match.match(/s:\d+:"([^"]+)"/)[1];
              console.log(`    - ${value}`);
            });
          }
        } catch (e) {
          console.log('  Error al extraer valores');
        }
      });
    }

    // 7. Verificar si existe relación directa con taxonomía país
    console.log('\n\n=== RELACIÓN DIRECTA CON TAXONOMÍA PAÍS ===');
    const [directRelation] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ') as countries
      FROM wp_posts p
      JOIN wp_term_relationships tr ON p.ID = tr.object_id
      JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
      JOIN wp_terms t ON tt.term_id = t.term_id
      WHERE p.post_type = 'pelicula'
      AND p.post_status = 'publish'
      AND tt.taxonomy = 'pais'
      GROUP BY p.ID
      LIMIT 10
    `);

    console.log('\nPelículas con países asignados directamente:');
    directRelation.forEach(row => {
      console.log(`- ${row.post_title}: ${row.countries}`);
    });

    // 8. Resumen final
    console.log('\n\n=== RESUMEN DEL ANÁLISIS ===');
    console.log('1. La meta_key "coproduccion" contiene información sobre países coproductores');
    console.log('2. Los formatos encontrados son:');
    console.log(`   - Serializado PHP: ${serializedCount} (arrays de valores)`);
    console.log(`   - JSON: ${jsonCount}`);
    console.log(`   - Numérico: ${numericCount} (posibles term_id)`);
    console.log(`   - Texto plano: ${plainTextCount}`);
    console.log('3. La taxonomía "pais" contiene los países disponibles');
    console.log('4. Las películas pueden tener múltiples países coproductores');

  } catch (error) {
    console.error('Error durante el análisis:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar el análisis
analyzeCoproduction()
  .then(() => console.log('\nAnálisis completado'))
  .catch(console.error);