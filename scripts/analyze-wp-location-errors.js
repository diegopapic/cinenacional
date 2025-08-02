const mysql = require('mysql2/promise');

async function analyzeLocationErrors() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Ajustar según tu configuración
    database: 'wordpress_cine'
  });

  try {
    console.log('=== ANÁLISIS DE ERRORES EN LOCALIDADES ===\n');

    // 1. Verificar el post_type "localidad"
    console.log('1. POST TYPE "LOCALIDAD"');
    const [localidadPosts] = await connection.execute(`
      SELECT 
        ID,
        post_title,
        post_name,
        post_status,
        post_parent
      FROM wp_posts
      WHERE post_type = 'localidad'
    `);

    if (localidadPosts.length > 0) {
      console.log(`Encontrados ${localidadPosts.length} posts de tipo "localidad":`);
      localidadPosts.forEach(post => {
        console.log(`- ID: ${post.ID}, Título: ${post.post_title}, Estado: ${post.post_status}`);
      });
    }

    // 2. Analizar nacionalidad (que también usa IDs de películas)
    console.log('\n\n2. ANÁLISIS DE NACIONALIDAD');
    const [nationalityData] = await connection.execute(`
      SELECT 
        pm.meta_value as nationality_id,
        COUNT(*) as count,
        p.post_title as movie_title,
        p.post_type
      FROM wp_postmeta pm
      LEFT JOIN wp_posts p ON p.ID = CAST(
        SUBSTRING(pm.meta_value, 
          LOCATE('"', pm.meta_value) + 1, 
          LOCATE('"', pm.meta_value, LOCATE('"', pm.meta_value) + 1) - LOCATE('"', pm.meta_value) - 1
        ) AS UNSIGNED
      )
      WHERE pm.meta_key = 'nacionalidad'
      AND pm.meta_value != ''
      GROUP BY pm.meta_value
      ORDER BY count DESC
      LIMIT 10
    `);

    console.log('Top 10 nacionalidades (y si apuntan a películas):');
    nationalityData.forEach(nat => {
      const idMatch = nat.nationality_id.match(/s:\d+:"(\d+)"/);
      const id = idMatch ? idMatch[1] : '?';
      console.log(`- ID ${id}: ${nat.count} personas${nat.movie_title ? ` → Película: "${nat.movie_title}"` : ''}`);
    });

    // 3. Verificar si hay datos correctos en lugar_nacimiento_import
    console.log('\n\n3. CAMPO lugar_nacimiento_import');
    const [importData] = await connection.execute(`
      SELECT 
        meta_value,
        COUNT(*) as count
      FROM wp_postmeta
      WHERE meta_key = 'lugar_nacimiento_import'
      AND meta_value != ''
      AND meta_value NOT LIKE 'a:%'
      GROUP BY meta_value
      ORDER BY count DESC
      LIMIT 15
    `);

    if (importData.length > 0) {
      console.log('Valores en lugar_nacimiento_import (texto plano):');
      importData.forEach(place => {
        console.log(`- "${place.meta_value}": ${place.count} personas`);
      });
    }

    // 4. Buscar si birthPlace tiene datos correctos
    console.log('\n\n4. ANÁLISIS DE birthPlace EN PERSONAS');
    const [birthPlaceData] = await connection.execute(`
      SELECT 
        pm.meta_value as birth_place,
        COUNT(*) as count
      FROM wp_postmeta pm
      JOIN wp_posts p ON p.ID = pm.post_id
      WHERE pm.meta_key = 'birthPlace'
      AND pm.meta_value != ''
      AND p.post_type = 'persona'
      GROUP BY pm.meta_value
      ORDER BY count DESC
      LIMIT 15
    `);

    if (birthPlaceData.length > 0) {
      console.log('Valores en birthPlace:');
      birthPlaceData.forEach(place => {
        console.log(`- "${place.birth_place}": ${place.count} personas`);
      });
    }

    // 5. Buscar todos los meta_keys relacionados con lugar
    console.log('\n\n5. TODOS LOS META_KEYS CON "lugar"');
    const [lugarKeys] = await connection.execute(`
      SELECT 
        DISTINCT meta_key,
        COUNT(*) as count
      FROM wp_postmeta
      WHERE meta_key LIKE '%lugar%'
      GROUP BY meta_key
      ORDER BY count DESC
    `);

    console.log('Meta keys encontrados:');
    lugarKeys.forEach(key => {
      console.log(`- ${key.meta_key}: ${key.count} registros`);
    });

    // 6. Verificar algunos ejemplos específicos
    console.log('\n\n6. EJEMPLOS DE PERSONAS CON DATOS MIXTOS');
    const [examples] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title as name,
        MAX(CASE WHEN pm.meta_key = 'lugar_nacimiento' THEN pm.meta_value END) as lugar_nacimiento,
        MAX(CASE WHEN pm.meta_key = 'lugar_nacimiento_import' THEN pm.meta_value END) as lugar_import,
        MAX(CASE WHEN pm.meta_key = 'birthPlace' THEN pm.meta_value END) as birthPlace,
        MAX(CASE WHEN pm.meta_key = 'nacionalidad' THEN pm.meta_value END) as nacionalidad
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
      WHERE p.post_type = 'persona'
      AND p.ID IN (
        SELECT DISTINCT post_id 
        FROM wp_postmeta 
        WHERE meta_key = 'lugar_nacimiento_import' 
        AND meta_value != ''
        AND meta_value NOT LIKE 'a:%'
        LIMIT 5
      )
      GROUP BY p.ID, p.post_title
    `);

    if (examples.length > 0) {
      console.log('Ejemplos de personas con diferentes campos:');
      examples.forEach(person => {
        console.log(`\n${person.name} (ID: ${person.ID}):`);
        console.log(`  - lugar_nacimiento: ${person.lugar_nacimiento || 'vacío'}`);
        console.log(`  - lugar_nacimiento_import: ${person.lugar_import || 'vacío'}`);
        console.log(`  - birthPlace: ${person.birthPlace || 'vacío'}`);
        console.log(`  - nacionalidad: ${person.nacionalidad || 'vacío'}`);
      });
    }

    // 7. Estrategia de corrección
    console.log('\n\n=== RESUMEN Y ESTRATEGIA DE CORRECCIÓN ===');
    console.log('1. Los IDs en lugar_nacimiento y nacionalidad son IDs de películas (ERROR)');
    console.log('2. Posiblemente lugar_nacimiento_import tiene los datos correctos en texto');
    console.log('3. La taxonomía "localidad" tiene países pero no ciudades');
    console.log('4. Necesitamos:');
    console.log('   - Importar ciudades/provincias desde lugar_nacimiento_import');
    console.log('   - Crear la jerarquía correcta en la tabla locations');
    console.log('   - Corregir las referencias en personas');
    console.log('   - Asignar nacionalidades basadas en el país de la localidad');

  } catch (error) {
    console.error('Error durante el análisis:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar el análisis
analyzeLocationErrors()
  .then(() => console.log('\nAnálisis completado'))
  .catch(console.error);