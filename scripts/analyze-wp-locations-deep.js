const mysql = require('mysql2/promise');

async function analyzeWPLocationsDeep() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Ajustar según tu configuración
    database: 'wordpress_cine'
  });

  try {
    console.log('=== ANÁLISIS PROFUNDO DE LOCALIDADES EN WORDPRESS ===\n');

    // 1. Buscar el término 7357 que aparece en muchos lugares de nacimiento
    console.log('1. BUSCANDO EL TÉRMINO 7357');
    const [term7357] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.taxonomy,
        tt.parent,
        tt.count,
        parent_t.name as parent_name
      FROM wp_terms t
      LEFT JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      LEFT JOIN wp_terms parent_t ON tt.parent = parent_t.term_id
      WHERE t.term_id = 7357
    `);

    if (term7357.length > 0) {
      console.log('Término 7357 encontrado:');
      term7357.forEach(t => {
        console.log(`- Nombre: ${t.name}`);
        console.log(`- Slug: ${t.slug}`);
        console.log(`- Taxonomía: ${t.taxonomy}`);
        console.log(`- Parent: ${t.parent} ${t.parent_name ? `(${t.parent_name})` : ''}`);
        console.log(`- Usos: ${t.count}`);
      });
    } else {
      console.log('El término 7357 NO fue encontrado');
    }

    // 2. Buscar TODAS las localidades con parent != 0
    console.log('\n\n2. LOCALIDADES CON JERARQUÍA (parent != 0)');
    const [childLocations] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.parent,
        parent_t.name as parent_name,
        tt.count
      FROM wp_terms t
      JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      JOIN wp_terms parent_t ON tt.parent = parent_t.term_id
      WHERE tt.taxonomy = 'localidad'
      AND tt.parent != 0
      ORDER BY parent_t.name, t.name
      LIMIT 50
    `);

    console.log(`Total de localidades con padre: ${childLocations.length}\n`);
    if (childLocations.length > 0) {
      console.log('Ejemplos de jerarquía:');
      let currentParent = '';
      childLocations.forEach(loc => {
        if (loc.parent_name !== currentParent) {
          currentParent = loc.parent_name;
          console.log(`\n${currentParent}:`);
        }
        console.log(`  - ${loc.name} (ID: ${loc.term_id}, usos: ${loc.count})`);
      });
    }

    // 3. Contar todos los niveles
    console.log('\n\n3. CONTEO TOTAL POR NIVELES');
    const [totalByLevel] = await connection.execute(`
      SELECT 
        CASE 
          WHEN parent = 0 THEN 'Países (nivel 1)'
          ELSE 'Provincias/Ciudades (nivel 2+)'
        END as nivel,
        COUNT(*) as cantidad
      FROM wp_term_taxonomy
      WHERE taxonomy = 'localidad'
      GROUP BY (parent = 0)
    `);

    totalByLevel.forEach(level => {
      console.log(`- ${level.nivel}: ${level.cantidad}`);
    });

    // 4. Analizar todos los valores únicos en lugar_nacimiento
    console.log('\n\n4. VALORES ÚNICOS EN lugar_nacimiento');
    const [uniqueBirthPlaces] = await connection.execute(`
      SELECT 
        meta_value,
        COUNT(*) as count
      FROM wp_postmeta
      WHERE meta_key = 'lugar_nacimiento'
      AND meta_value != ''
      AND meta_value IS NOT NULL
      GROUP BY meta_value
      ORDER BY count DESC
      LIMIT 20
    `);

    console.log('Top 20 lugares de nacimiento más frecuentes:');
    for (const place of uniqueBirthPlaces) {
      console.log(`\nValor: ${place.meta_value} (${place.count} personas)`);
      
      // Intentar extraer el ID del array serializado
      if (place.meta_value.startsWith('a:')) {
        const match = place.meta_value.match(/s:\d+:"(\d+)"/);
        if (match) {
          const locationId = match[1];
          // Buscar qué localidad es
          const [location] = await connection.execute(`
            SELECT t.name, tt.parent, parent_t.name as parent_name
            FROM wp_terms t
            JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
            LEFT JOIN wp_terms parent_t ON tt.parent = parent_t.term_id
            WHERE t.term_id = ?
          `, [locationId]);
          
          if (location.length > 0) {
            const loc = location[0];
            const fullName = loc.parent_name ? `${loc.name}, ${loc.parent_name}` : loc.name;
            console.log(`  → ${fullName}`);
          }
        }
      }
    }

    // 5. Buscar provincias argentinas
    console.log('\n\n5. PROVINCIAS ARGENTINAS');
    const [argentinaProvinces] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.count
      FROM wp_terms t
      JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'localidad'
      AND tt.parent = 11229  -- ID de Argentina
      ORDER BY t.name
    `);

    if (argentinaProvinces.length > 0) {
      console.log(`Provincias de Argentina encontradas: ${argentinaProvinces.length}`);
      argentinaProvinces.forEach(prov => {
        console.log(`- ${prov.name} (ID: ${prov.term_id}, usos: ${prov.count})`);
      });
    } else {
      console.log('No se encontraron provincias bajo Argentina');
    }

    // 6. Buscar ciudades de Buenos Aires
    console.log('\n\n6. CIUDADES DE BUENOS AIRES');
    // Primero buscar si existe Buenos Aires como provincia
    const [buenosAires] = await connection.execute(`
      SELECT term_id 
      FROM wp_terms 
      WHERE name LIKE '%Buenos Aires%' 
      AND term_id IN (
        SELECT term_id FROM wp_term_taxonomy 
        WHERE taxonomy = 'localidad' AND parent = 11229
      )
    `);

    if (buenosAires.length > 0) {
      const baId = buenosAires[0].term_id;
      console.log(`Buenos Aires provincia ID: ${baId}`);
      
      const [baCities] = await connection.execute(`
        SELECT 
          t.term_id,
          t.name,
          t.slug,
          tt.count
        FROM wp_terms t
        JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
        WHERE tt.taxonomy = 'localidad'
        AND tt.parent = ?
        ORDER BY t.name
        LIMIT 20
      `, [baId]);

      if (baCities.length > 0) {
        console.log(`\nCiudades en Buenos Aires: ${baCities.length}`);
        baCities.forEach(city => {
          console.log(`- ${city.name} (ID: ${city.term_id})`);
        });
      }
    }

    // 7. Verificar si hay lugar_muerte
    console.log('\n\n7. ANÁLISIS DE lugar_muerte');
    const [deathPlaces] = await connection.execute(`
      SELECT 
        meta_value,
        COUNT(*) as count
      FROM wp_postmeta
      WHERE meta_key = 'lugar_muerte'
      AND meta_value != ''
      AND meta_value IS NOT NULL
      GROUP BY meta_value
      ORDER BY count DESC
      LIMIT 10
    `);

    console.log(`Total de personas con lugar de muerte: ${deathPlaces.reduce((sum, p) => sum + p.count, 0)}`);
    console.log('\nLugares de muerte más frecuentes:');
    for (const place of deathPlaces) {
      console.log(`\n${place.meta_value} (${place.count} personas)`);
      
      // Intentar extraer el ID
      if (place.meta_value.startsWith('a:')) {
        const match = place.meta_value.match(/s:\d+:"(\d+)"/);
        if (match) {
          const locationId = match[1];
          const [location] = await connection.execute(`
            SELECT t.name, parent_t.name as parent_name
            FROM wp_terms t
            JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
            LEFT JOIN wp_terms parent_t ON tt.parent = parent_t.term_id
            WHERE t.term_id = ?
          `, [locationId]);
          
          if (location.length > 0) {
            const loc = location[0];
            const fullName = loc.parent_name ? `${loc.name}, ${loc.parent_name}` : loc.name;
            console.log(`  → ${fullName}`);
          }
        }
      }
    }

    // 8. Resumen estadístico
    console.log('\n\n=== RESUMEN ESTADÍSTICO ===');
    const [stats] = await connection.execute(`
      SELECT 
        'Total localidades' as concepto,
        COUNT(*) as cantidad
      FROM wp_term_taxonomy
      WHERE taxonomy = 'localidad'
      
      UNION ALL
      
      SELECT 
        'Países (parent=0)' as concepto,
        COUNT(*) as cantidad
      FROM wp_term_taxonomy
      WHERE taxonomy = 'localidad' AND parent = 0
      
      UNION ALL
      
      SELECT 
        'Provincias/Ciudades (parent!=0)' as concepto,
        COUNT(*) as cantidad
      FROM wp_term_taxonomy
      WHERE taxonomy = 'localidad' AND parent != 0
      
      UNION ALL
      
      SELECT 
        'Personas con lugar_nacimiento' as concepto,
        COUNT(DISTINCT post_id) as cantidad
      FROM wp_postmeta
      WHERE meta_key = 'lugar_nacimiento' AND meta_value != ''
      
      UNION ALL
      
      SELECT 
        'Personas con lugar_muerte' as concepto,
        COUNT(DISTINCT post_id) as cantidad
      FROM wp_postmeta
      WHERE meta_key = 'lugar_muerte' AND meta_value != ''
    `);

    console.log('\nEstadísticas finales:');
    stats.forEach(stat => {
      console.log(`- ${stat.concepto}: ${stat.cantidad}`);
    });

  } catch (error) {
    console.error('Error durante el análisis:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar el análisis
analyzeWPLocationsDeep()
  .then(() => console.log('\nAnálisis profundo completado'))
  .catch(console.error);