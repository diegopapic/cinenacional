// /scripts/analyze-wp-countries.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function analyzeWordPressCountries() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: 'wordpress_cine'
  });

  try {
    console.log('🔍 Analizando estructura de países en WordPress...\n');

    // 1. Buscar taxonomías relacionadas con países
    const [taxonomies] = await connection.execute(`
      SELECT DISTINCT 
        tt.taxonomy,
        COUNT(DISTINCT tr.object_id) as total_movies
      FROM wp_term_taxonomy tt
      JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
      JOIN wp_posts p ON tr.object_id = p.ID
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND tt.taxonomy IN ('pais', 'paises', 'country', 'countries', 'coproduccion')
      GROUP BY tt.taxonomy
    `);

    console.log('Taxonomías encontradas:');
    console.table(taxonomies);

    // 2. Obtener todos los países/términos únicos
    const [countries] = await connection.execute(`
      SELECT 
        t.name as country_name,
        tt.taxonomy,
        COUNT(DISTINCT tr.object_id) as movie_count
      FROM wp_terms t
      JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
      JOIN wp_posts p ON tr.object_id = p.ID
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND tt.taxonomy IN ('pais', 'paises', 'country', 'countries', 'coproduccion')
      GROUP BY t.name, tt.taxonomy
      ORDER BY movie_count DESC
    `);

    console.log('\n📍 Países encontrados:');
    console.table(countries);

    // 3. Analizar películas sin país asignado
    const [moviesWithoutCountry] = await connection.execute(`
      SELECT COUNT(DISTINCT p.ID) as total
      FROM wp_posts p
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND p.ID NOT IN (
          SELECT DISTINCT tr.object_id
          FROM wp_term_relationships tr
          JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
          WHERE tt.taxonomy IN ('pais', 'paises', 'country', 'countries', 'coproduccion')
        )
    `);

    console.log(`\n🎬 Películas sin país asignado: ${moviesWithoutCountry[0].total}`);

    // 4. Analizar coproducciones (películas con más de un país)
    const [coproductions] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ') as countries,
        COUNT(DISTINCT t.term_id) as country_count
      FROM wp_posts p
      JOIN wp_term_relationships tr ON p.ID = tr.object_id
      JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
      JOIN wp_terms t ON tt.term_id = t.term_id
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND tt.taxonomy IN ('pais', 'paises', 'country', 'countries', 'coproduccion')
      GROUP BY p.ID
      HAVING country_count > 1
      ORDER BY country_count DESC
      LIMIT 10
    `);

    console.log('\n🤝 Ejemplos de coproducciones:');
    console.table(coproductions);

    // 5. Estadísticas generales
    const [stats] = await connection.execute(`
      SELECT 
        CASE 
          WHEN country_count = 0 THEN 'Sin país (asumimos Argentina)'
          WHEN country_count = 1 THEN 'Un país'
          ELSE 'Coproducción'
        END as tipo,
        COUNT(*) as cantidad
      FROM (
        SELECT 
          p.ID,
          COUNT(DISTINCT t.term_id) as country_count
        FROM wp_posts p
        LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
        LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy IN ('pais', 'paises', 'country', 'countries', 'coproduccion')
        LEFT JOIN wp_terms t ON tt.term_id = t.term_id
        WHERE p.post_type = 'pelicula'
          AND p.post_status = 'publish'
        GROUP BY p.ID
      ) as movie_countries
      GROUP BY tipo
    `);

    console.log('\n📊 Distribución de películas por tipo de producción:');
    console.table(stats);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

analyzeWordPressCountries();