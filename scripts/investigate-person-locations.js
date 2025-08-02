const mysql = require('mysql2/promise');

async function investigatePersonLocations() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Ajustar según tu configuración
    database: 'wordpress_cine'
  });

  try {
    console.log('=== INVESTIGACIÓN PROFUNDA DE LUGARES EN PERSONAS ===\n');

    // 1. Buscar a Víctor Laplace específicamente
    console.log('1. BUSCANDO A VÍCTOR LAPLACE');
    const [laplace] = await connection.execute(`
      SELECT 
        p.ID,
        p.post_title,
        p.post_name,
        GROUP_CONCAT(
          CONCAT(pm.meta_key, ': ', pm.meta_value) 
          ORDER BY pm.meta_key 
          SEPARATOR '\n'
        ) as metadata
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
      WHERE p.post_type = 'persona'
      AND p.post_title LIKE '%Laplace%'
      GROUP BY p.ID, p.post_title, p.post_name
    `);

    if (laplace.length > 0) {
      laplace.forEach(person => {
        console.log(`\nPersona: ${person.post_title} (ID: ${person.ID})`);
        console.log('Metadatos relevantes:');
        const lines = person.metadata.split('\n');
        lines.forEach(line => {
          if (line.includes('lugar') || line.includes('naci') || line.includes('birth') || 
              line.includes('muerte') || line.includes('death') || line.includes('nacionalidad')) {
            console.log(`  ${line}`);
          }
        });
      });
    }

    // 2. Analizar el patrón de los datos
    console.log('\n\n2. ANALIZANDO PATRÓN DE DATOS EN lugar_nacimiento');
    const [patterns] = await connection.execute(`
      SELECT 
        CASE 
          WHEN meta_value LIKE 'a:1:{i:0;s:%' THEN 'Array serializado (1 elemento)'
          WHEN meta_value LIKE 'a:2:{%' THEN 'Array serializado (2 elementos)'
          WHEN meta_value LIKE 'a:%' THEN 'Array serializado (múltiple)'
          WHEN meta_value REGEXP '^[0-9]+$' THEN 'ID numérico simple'
          WHEN meta_value = '' THEN 'Vacío'
          ELSE 'Otro formato'
        END as formato,
        COUNT(*) as cantidad,
        GROUP_CONCAT(DISTINCT meta_value ORDER BY meta_value LIMIT 3) as ejemplos
      FROM wp_postmeta
      WHERE meta_key = 'lugar_nacimiento'
      GROUP BY formato
    `);

    console.log('Formatos encontrados:');
    patterns.forEach(pattern => {
      console.log(`\n- ${pattern.formato}: ${pattern.cantidad} registros`);
      if (pattern.ejemplos && pattern.formato !== 'Vacío') {
        console.log(`  Ejemplos: ${pattern.ejemplos.substring(0, 100)}...`);
      }
    });

    // 3. Buscar si hay algún campo con texto plano
    console.log('\n\n3. BUSCANDO CAMPOS CON TEXTO PLANO');
    const [textFields] = await connection.execute(`
      SELECT 
        pm.meta_key,
        pm.meta_value,
        p.post_title
      FROM wp_postmeta pm
      JOIN wp_posts p ON p.ID = pm.post_id
      WHERE p.post_type = 'persona'
      AND pm.meta_key IN ('birthPlace', 'birth_place', 'lugar_nacimiento_texto', 'ciudad_nacimiento')
      AND pm.meta_value != ''
      AND pm.meta_value NOT LIKE 'a:%'
      LIMIT 20
    `);

    if (textFields.length > 0) {
      console.log('Campos con texto plano encontrados:');
      textFields.forEach(field => {
        console.log(`- ${field.post_title}: ${field.meta_key} = "${field.meta_value}"`);
      });
    } else {
      console.log('No se encontraron campos con texto plano para lugares');
    }

    // 4. Analizar qué representan realmente los IDs
    console.log('\n\n4. DECODIFICANDO IDs MÁS COMUNES');
    const [topLocationIds] = await connection.execute(`
      SELECT 
        SUBSTRING(
          meta_value,
          LOCATE('"', meta_value) + 1,
          LOCATE('"', meta_value, LOCATE('"', meta_value) + 1) - LOCATE('"', meta_value) - 1
        ) as location_id,
        COUNT(*) as count
      FROM wp_postmeta
      WHERE meta_key = 'lugar_nacimiento'
      AND meta_value LIKE 'a:1:{i:0;s:%'
      GROUP BY location_id
      ORDER BY count DESC
      LIMIT 10
    `);

    console.log('IDs más usados como lugar de nacimiento:');
    for (const loc of topLocationIds) {
      // Buscar qué es este ID en wp_posts
      const [post] = await connection.execute(`
        SELECT ID, post_title, post_type, post_status
        FROM wp_posts
        WHERE ID = ?
      `, [loc.location_id]);

      if (post.length > 0) {
        console.log(`\nID ${loc.location_id} (${loc.count} personas):`);
        console.log(`  Título: ${post[0].post_title}`);
        console.log(`  Tipo: ${post[0].post_type}`);
        console.log(`  Estado: ${post[0].post_status}`);
      } else {
        // Si no es un post, buscar en terms
        const [term] = await connection.execute(`
          SELECT t.term_id, t.name, tt.taxonomy
          FROM wp_terms t
          JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
          WHERE t.term_id = ?
        `, [loc.location_id]);

        if (term.length > 0) {
          console.log(`\nID ${loc.location_id} (${loc.count} personas):`);
          console.log(`  Término: ${term[0].name}`);
          console.log(`  Taxonomía: ${term[0].taxonomy}`);
        } else {
          console.log(`\nID ${loc.location_id} (${loc.count} personas): NO ENCONTRADO`);
        }
      }
    }

    // 5. Buscar si hay algún campo ACF que tenga la información correcta
    console.log('\n\n5. CAMPOS ACF (Advanced Custom Fields)');
    const [acfFields] = await connection.execute(`
      SELECT 
        pm1.meta_key as field_key,
        pm1.meta_value as field_reference,
        pm2.meta_value as field_value,
        COUNT(*) as count
      FROM wp_postmeta pm1
      JOIN wp_postmeta pm2 ON pm1.post_id = pm2.post_id 
        AND pm2.meta_key = SUBSTRING(pm1.meta_key, 2)
      WHERE pm1.meta_key LIKE '_%lugar%'
      AND pm1.meta_value LIKE 'field_%'
      GROUP BY pm1.meta_key, pm1.meta_value
    `);

    if (acfFields.length > 0) {
      console.log('Campos ACF relacionados con lugares:');
      acfFields.forEach(field => {
        console.log(`- ${field.field_key} → ${field.field_reference} (${field.count} registros)`);
      });
    }

    // 6. Verificar si hay personas con lugares que NO son películas
    console.log('\n\n6. VERIFICANDO PERSONAS CON LUGARES VÁLIDOS');
    const [validLocations] = await connection.execute(`
      SELECT 
        pm.post_id,
        p.post_title as person_name,
        pm.meta_value as location_data,
        SUBSTRING(
          pm.meta_value,
          LOCATE('"', pm.meta_value) + 1,
          LOCATE('"', pm.meta_value, LOCATE('"', pm.meta_value) + 1) - LOCATE('"', pm.meta_value) - 1
        ) as location_id
      FROM wp_postmeta pm
      JOIN wp_posts p ON p.ID = pm.post_id
      WHERE pm.meta_key = 'lugar_nacimiento'
      AND pm.meta_value != ''
      AND p.post_type = 'persona'
      AND p.post_title IN ('Víctor Laplace', 'Norma Aleandro', 'Ricardo Darín', 'Graciela Borges', 'Luis Brandoni')
    `);

    if (validLocations.length > 0) {
      console.log('\nPersonas conocidas y sus lugares de nacimiento:');
      for (const person of validLocations) {
        const [location] = await connection.execute(`
          SELECT post_title, post_type 
          FROM wp_posts 
          WHERE ID = ?
        `, [person.location_id]);

        if (location.length > 0) {
          console.log(`- ${person.person_name}: ${location[0].post_title} (tipo: ${location[0].post_type})`);
        }
      }
    }

  } catch (error) {
    console.error('Error durante la investigación:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar la investigación
investigatePersonLocations()
  .then(() => console.log('\nInvestigación completada'))
  .catch(console.error);