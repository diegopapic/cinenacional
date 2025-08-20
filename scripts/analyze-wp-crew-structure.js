// scripts/analyze-wp-crew-structure.js
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function analyzeCrewStructure() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  });

  try {
    console.log('🔍 Analizando estructura del crew en WordPress...\n');

    // 1. Buscar todos los meta_keys relacionados con crew/equipo
    const [crewMetaKeys] = await connection.execute(`
      SELECT DISTINCT meta_key, COUNT(*) as count
      FROM wp_postmeta pm
      JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'pelicula'
      AND (
        meta_key LIKE '%equipo%' 
        OR meta_key LIKE '%crew%'
        OR meta_key LIKE '%director%'
        OR meta_key LIKE '%productor%'
        OR meta_key LIKE '%guion%'
        OR meta_key LIKE '%fotografia%'
        OR meta_key LIKE '%montaje%'
        OR meta_key LIKE '%musica%'
        OR meta_key LIKE '%sonido%'
        OR meta_key LIKE '%arte%'
        OR meta_key LIKE '%vestuario%'
        OR meta_key LIKE '%maquillaje%'
      )
      GROUP BY meta_key
      ORDER BY count DESC
      LIMIT 50
    `);

    console.log('📊 Meta keys relacionados con crew:');
    console.table(crewMetaKeys.map(k => ({
      meta_key: k.meta_key,
      count: k.count
    })));

    // 2. Analizar estructura del campo principal de crew (probablemente serializado)
    const [sampleCrew] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        pm.meta_key,
        pm.meta_value
      FROM wp_postmeta pm
      JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'pelicula'
      AND (
        meta_key LIKE '%equipo%' 
        OR meta_key = 'crew'
        OR meta_key = '_crew'
      )
      AND pm.meta_value != ''
      AND pm.meta_value IS NOT NULL
      LIMIT 10
    `);

    console.log('\n📋 Ejemplos de datos de crew:');
    for (const row of sampleCrew) {
      console.log(`\nPelícula: ${row.post_title} (ID: ${row.ID})`);
      console.log(`Meta key: ${row.meta_key}`);
      
      // Intentar deserializar si es PHP serialized
      if (row.meta_value.startsWith('a:')) {
        try {
          const unserialize = require('php-unserialize');
          const data = unserialize.unserialize(row.meta_value);
          console.log('Datos deserializados:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
        } catch (e) {
          console.log('Valor raw (primeros 200 chars):', row.meta_value.substring(0, 200));
        }
      } else {
        console.log('Valor:', row.meta_value.substring(0, 200));
      }
    }

    // 3. Buscar patrones de campos repetidos (ACF repeater fields)
    const [repeaterFields] = await connection.execute(`
      SELECT DISTINCT meta_key
      FROM wp_postmeta pm
      JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'pelicula'
      AND meta_key REGEXP '^(equipo|crew)_[0-9]+_'
      LIMIT 50
    `);

    console.log('\n🔄 Campos repetidos encontrados (ACF repeater):');
    console.table(repeaterFields.map(f => ({ field: f.meta_key })));

    // 4. Analizar estructura de un repeater field completo
    if (repeaterFields.length > 0) {
      const baseField = repeaterFields[0].meta_key.split('_')[0]; // 'equipo' o 'crew'
      
      const [movieWithCrew] = await connection.execute(`
        SELECT DISTINCT post_id
        FROM wp_postmeta
        WHERE meta_key LIKE '${baseField}_%'
        LIMIT 1
      `);

      if (movieWithCrew.length > 0) {
        const movieId = movieWithCrew[0].post_id;
        
        const [allCrewData] = await connection.execute(`
          SELECT meta_key, meta_value
          FROM wp_postmeta
          WHERE post_id = ?
          AND meta_key LIKE '${baseField}_%'
          ORDER BY meta_key
        `, [movieId]);

        console.log(`\n🎬 Estructura completa del crew para película ID ${movieId}:`);
        
        // Agrupar por índice del repeater
        const crewByIndex = {};
        for (const row of allCrewData) {
          const match = row.meta_key.match(new RegExp(`^${baseField}_(\\d+)_(.+)$`));
          if (match) {
            const index = match[1];
            const field = match[2];
            if (!crewByIndex[index]) {
              crewByIndex[index] = { _order: parseInt(index) };
            }
            crewByIndex[index][field] = row.meta_value;
          }
        }

        console.log('Crew estructurado por orden:');
        Object.keys(crewByIndex)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .slice(0, 5)
          .forEach(index => {
            console.log(`\n  Posición ${index}:`, crewByIndex[index]);
          });
      }
    }

    // 5. Verificar si hay campos específicos para roles principales
    const [mainRoles] = await connection.execute(`
      SELECT 
        meta_key,
        COUNT(*) as count,
        COUNT(DISTINCT meta_value) as unique_values
      FROM wp_postmeta pm
      JOIN wp_posts p ON pm.post_id = p.ID
      WHERE p.post_type = 'pelicula'
      AND meta_key IN (
        'director', '_director', 'direccion',
        'productor', '_productor', 'produccion',
        'guion', '_guion', 'guionista',
        'fotografia', '_fotografia', 'director_de_fotografia',
        'montaje', '_montaje', 'editor',
        'musica', '_musica', 'compositor'
      )
      GROUP BY meta_key
      ORDER BY count DESC
    `);

    if (mainRoles.length > 0) {
      console.log('\n🎭 Campos de roles principales encontrados:');
      console.table(mainRoles);
    }

    // 6. Estadísticas generales
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(DISTINCT p.ID) as total_movies,
        COUNT(DISTINCT CASE 
          WHEN pm.meta_key LIKE '%equipo%' OR pm.meta_key LIKE '%crew%' 
          THEN p.ID 
        END) as movies_with_crew
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
      WHERE p.post_type = 'pelicula'
    `);

    console.log('\n📈 Estadísticas:');
    console.log(`Total de películas: ${stats[0].total_movies}`);
    console.log(`Películas con datos de crew: ${stats[0].movies_with_crew}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

analyzeCrewStructure();