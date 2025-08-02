const mysql = require('mysql2/promise');

async function analyzeWPLocations() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Ajustar según tu configuración
    database: 'wordpress_cine'
  });

  try {
    console.log('=== ANÁLISIS DE LOCALIDADES EN WORDPRESS ===\n');

    // 1. Verificar estructura de la taxonomía "localidad"
    console.log('1. ESTRUCTURA DE LA TAXONOMÍA LOCALIDAD');
    const [locationTaxonomy] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.parent,
        tt.count,
        tt.taxonomy
      FROM wp_terms t
      JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'localidad'
      ORDER BY tt.parent, t.name
      LIMIT 20
    `);

    console.log(`Total de términos en localidad: ${locationTaxonomy.length}\n`);
    console.log('Muestra de la estructura:');
    console.log('ID\tPadre\tNombre\t\t\tSlug\t\t\tUsos');
    console.log('--\t-----\t------\t\t\t----\t\t\t----');
    
    locationTaxonomy.forEach(loc => {
      const name = loc.name.padEnd(20);
      const slug = loc.slug.padEnd(20);
      console.log(`${loc.term_id}\t${loc.parent}\t${name}\t${slug}\t${loc.count}`);
    });

    // 2. Analizar jerarquía - buscar localidades con parent != 0
    console.log('\n\n2. ANÁLISIS DE JERARQUÍA');
    const [hierarchy] = await connection.execute(`
      SELECT 
        child.term_id as child_id,
        child.name as child_name,
        parent.term_id as parent_id,
        parent.name as parent_name,
        grandparent.term_id as grandparent_id,
        grandparent.name as grandparent_name
      FROM wp_terms child
      JOIN wp_term_taxonomy tt_child ON child.term_id = tt_child.term_id
      LEFT JOIN wp_terms parent ON tt_child.parent = parent.term_id
      LEFT JOIN wp_term_taxonomy tt_parent ON parent.term_id = tt_parent.term_id
      LEFT JOIN wp_terms grandparent ON tt_parent.parent = grandparent.term_id
      WHERE tt_child.taxonomy = 'localidad'
      AND tt_child.parent != 0
      LIMIT 20
    `);

    console.log('Ejemplos de jerarquía:');
    hierarchy.forEach(h => {
      let path = '';
      if (h.grandparent_name) path = `${h.grandparent_name} > `;
      if (h.parent_name) path += `${h.parent_name} > `;
      path += h.child_name;
      console.log(`- ${path}`);
    });

    // 3. Contar niveles de jerarquía
    console.log('\n\n3. NIVELES DE JERARQUÍA');
    const [levels] = await connection.execute(`
      SELECT 
        CASE 
          WHEN parent = 0 THEN 'Nivel 1 (Raíz)'
          WHEN parent IN (SELECT term_id FROM wp_term_taxonomy WHERE parent = 0 AND taxonomy = 'localidad') THEN 'Nivel 2'
          ELSE 'Nivel 3+'
        END as nivel,
        COUNT(*) as cantidad
      FROM wp_term_taxonomy
      WHERE taxonomy = 'localidad'
      GROUP BY nivel
    `);

    levels.forEach(level => {
      console.log(`${level.nivel}: ${level.cantidad} localidades`);
    });

    // 4. Buscar países en la taxonomía localidad
    console.log('\n\n4. PAÍSES EN LA TAXONOMÍA LOCALIDAD');
    const [countriesInLocalidad] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.parent,
        tt.count
      FROM wp_terms t
      JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'localidad'
      AND tt.parent = 0
      AND t.name IN ('Argentina', 'España', 'Francia', 'Italia', 'Estados Unidos', 'Brasil', 'México', 'Chile', 'Uruguay')
      ORDER BY t.name
    `);

    console.log('Países encontrados como localidades de nivel raíz:');
    countriesInLocalidad.forEach(country => {
      console.log(`- ${country.name} (ID: ${country.term_id}, slug: ${country.slug})`);
    });

    // 5. Analizar uso en personas
    console.log('\n\n5. USO DE LOCALIDADES EN PERSONAS');
    
    // Buscar campos de lugar de nacimiento/muerte
    const [birthPlaceMeta] = await connection.execute(`
      SELECT 
        meta_key,
        COUNT(*) as count
      FROM wp_postmeta
      WHERE meta_key LIKE '%lugar%' 
         OR meta_key LIKE '%nacimiento%'
         OR meta_key LIKE '%birth%'
         OR meta_key LIKE '%ciudad%'
         OR meta_key LIKE '%localidad%'
      GROUP BY meta_key
      ORDER BY count DESC
      LIMIT 20
    `);

    console.log('Meta keys relacionadas con lugares:');
    birthPlaceMeta.forEach(meta => {
      console.log(`- ${meta.meta_key}: ${meta.count} registros`);
    });

    // 6. Ver muestra de valores de lugar_nacimiento
    if (birthPlaceMeta.find(m => m.meta_key === 'lugar_nacimiento')) {
      console.log('\n\n6. MUESTRA DE VALORES EN lugar_nacimiento');
      const [sampleBirthPlaces] = await connection.execute(`
        SELECT 
          pm.post_id,
          p.post_title as person_name,
          pm.meta_value as birth_place_id,
          t.name as location_name,
          parent_t.name as parent_location_name
        FROM wp_postmeta pm
        JOIN wp_posts p ON p.ID = pm.post_id
        LEFT JOIN wp_terms t ON t.term_id = pm.meta_value
        LEFT JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
        LEFT JOIN wp_terms parent_t ON tt.parent = parent_t.term_id
        WHERE pm.meta_key = 'lugar_nacimiento'
        AND pm.meta_value != ''
        AND pm.meta_value IS NOT NULL
        AND p.post_type = 'persona'
        LIMIT 15
      `);

      console.log('Ejemplos de personas con lugar de nacimiento:');
      sampleBirthPlaces.forEach(person => {
        let location = person.location_name || `[ID: ${person.birth_place_id}]`;
        if (person.parent_location_name) {
          location = `${location} (${person.parent_location_name})`;
        }
        console.log(`- ${person.person_name}: ${location}`);
      });
    }

    // 7. Estructura completa de ejemplo (Argentina)
    console.log('\n\n7. ESTRUCTURA COMPLETA - EJEMPLO ARGENTINA');
    const argentinaId = countriesInLocalidad.find(c => c.name === 'Argentina')?.term_id;
    
    if (argentinaId) {
      const [argentinaTree] = await connection.execute(`
        WITH RECURSIVE location_tree AS (
          -- Argentina como raíz
          SELECT 
            t.term_id,
            t.name,
            t.slug,
            tt.parent,
            0 as level,
            CAST(t.name AS CHAR(500)) as path
          FROM wp_terms t
          JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
          WHERE t.term_id = ?
          
          UNION ALL
          
          -- Hijos recursivos
          SELECT 
            t.term_id,
            t.name,
            t.slug,
            tt.parent,
            lt.level + 1,
            CONCAT(lt.path, ' > ', t.name)
          FROM wp_terms t
          JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
          JOIN location_tree lt ON tt.parent = lt.term_id
          WHERE tt.taxonomy = 'localidad'
        )
        SELECT * FROM location_tree
        WHERE level <= 2
        ORDER BY path
        LIMIT 30
      `, [argentinaId]);

      console.log('Estructura jerárquica de Argentina (primeros 2 niveles):');
      argentinaTree.forEach(loc => {
        const indent = '  '.repeat(loc.level);
        console.log(`${indent}${loc.name} (ID: ${loc.term_id})`);
      });
    }

    // 8. Resumen
    console.log('\n\n=== RESUMEN ===');
    console.log('1. La taxonomía "localidad" contiene países, provincias, ciudades y localidades');
    console.log('2. Usa una estructura jerárquica con el campo "parent"');
    console.log('3. Los países tienen parent = 0 (son raíz)');
    console.log('4. Las personas usan el meta_key "lugar_nacimiento" con el term_id de la localidad');
    console.log('5. Necesitamos migrar manteniendo la jerarquía completa');

  } catch (error) {
    console.error('Error durante el análisis:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar el análisis
analyzeWPLocations()
  .then(() => console.log('\nAnálisis completado'))
  .catch(console.error);