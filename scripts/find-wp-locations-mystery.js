const mysql = require('mysql2/promise');

async function findMysteryLocations() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Ajustar según tu configuración
    database: 'wordpress_cine'
  });

  try {
    console.log('=== BUSCANDO LAS LOCALIDADES MISTERIOSAS ===\n');

    // IDs misteriosos más comunes
    const mysteryIds = [7357, 7448, 7475, 7443, 7498, 7637, 7511, 7504, 7458];

    // 1. Buscar estos IDs en wp_terms
    console.log('1. BUSCANDO EN wp_terms');
    const placeholders = mysteryIds.map(() => '?').join(',');
    const [termsFound] = await connection.execute(`
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
      WHERE t.term_id IN (${placeholders})
      ORDER BY t.term_id
    `, mysteryIds);

    if (termsFound.length > 0) {
      console.log(`Encontrados ${termsFound.length} términos:\n`);
      termsFound.forEach(term => {
        console.log(`ID: ${term.term_id}`);
        console.log(`  Nombre: ${term.name}`);
        console.log(`  Taxonomía: ${term.taxonomy}`);
        console.log(`  Parent: ${term.parent} ${term.parent_name ? `(${term.parent_name})` : ''}`);
        console.log(`  Usos: ${term.count}\n`);
      });
    } else {
      console.log('Ninguno de estos IDs existe en wp_terms\n');
    }

    // 2. Buscar en wp_posts (podrían ser posts de tipo localidad)
    console.log('2. BUSCANDO EN wp_posts');
    const [postsFound] = await connection.execute(`
      SELECT 
        ID,
        post_title,
        post_type,
        post_status,
        post_parent,
        post_name
      FROM wp_posts
      WHERE ID IN (${placeholders})
      ORDER BY ID
    `, mysteryIds);

    if (postsFound.length > 0) {
      console.log(`Encontrados ${postsFound.length} posts:\n`);
      postsFound.forEach(post => {
        console.log(`ID: ${post.ID}`);
        console.log(`  Título: ${post.post_title}`);
        console.log(`  Tipo: ${post.post_type}`);
        console.log(`  Estado: ${post.post_status}`);
        console.log(`  Parent: ${post.post_parent}\n`);
      });
    } else {
      console.log('Ninguno de estos IDs existe en wp_posts\n');
    }

    // 3. Buscar todos los post_types únicos
    console.log('3. TIPOS DE POSTS DISPONIBLES');
    const [postTypes] = await connection.execute(`
      SELECT 
        DISTINCT post_type,
        COUNT(*) as count
      FROM wp_posts
      WHERE post_status = 'publish'
      GROUP BY post_type
      ORDER BY count DESC
    `);

    console.log('Post types encontrados:');
    postTypes.forEach(type => {
      console.log(`- ${type.post_type}: ${type.count} posts`);
    });

    // 4. Si existe un post_type relacionado con localidades
    console.log('\n4. BUSCANDO POST TYPES RELACIONADOS CON LOCALIDADES');
    const [locationPostTypes] = await connection.execute(`
      SELECT 
        DISTINCT post_type,
        COUNT(*) as count
      FROM wp_posts
      WHERE post_type LIKE '%local%' 
         OR post_type LIKE '%ciudad%'
         OR post_type LIKE '%lugar%'
         OR post_type LIKE '%location%'
         OR post_type LIKE '%city%'
      GROUP BY post_type
    `);

    if (locationPostTypes.length > 0) {
      console.log('Post types relacionados con localidades:');
      locationPostTypes.forEach(type => {
        console.log(`- ${type.post_type}: ${type.count} posts`);
      });
    } else {
      console.log('No se encontraron post types relacionados con localidades');
    }

    // 5. Buscar en todas las taxonomías
    console.log('\n5. TODAS LAS TAXONOMÍAS DISPONIBLES');
    const [allTaxonomies] = await connection.execute(`
      SELECT 
        DISTINCT taxonomy,
        COUNT(*) as count
      FROM wp_term_taxonomy
      GROUP BY taxonomy
      ORDER BY taxonomy
    `);

    console.log('Taxonomías encontradas:');
    allTaxonomies.forEach(tax => {
      console.log(`- ${tax.taxonomy}: ${tax.count} términos`);
    });

    // 6. Analizar la estructura de wp_postmeta para personas
    console.log('\n6. ANÁLISIS DE METADATOS DE PERSONAS');
    // Primero obtener un ID de persona que tenga lugar_nacimiento 7448
    const [personWithLocation] = await connection.execute(`
      SELECT post_id 
      FROM wp_postmeta 
      WHERE meta_key = 'lugar_nacimiento' 
      AND meta_value = 'a:1:{i:0;s:4:"7448";}'
      LIMIT 1
    `);

    if (personWithLocation.length > 0) {
      const personId = personWithLocation[0].post_id;
      
      const [personMeta] = await connection.execute(`
        SELECT 
          pm.meta_key,
          pm.meta_value,
          p.post_title as person_name
        FROM wp_postmeta pm
        JOIN wp_posts p ON p.ID = pm.post_id
        WHERE p.ID = ?
        ORDER BY pm.meta_key
      `, [personId]);

      if (personMeta.length > 0) {
        console.log(`\nMetadatos de ejemplo para: ${personMeta[0].person_name}`);
        console.log('Meta keys encontrados:');
        const uniqueKeys = [...new Set(personMeta.map(m => m.meta_key))];
        uniqueKeys.forEach(key => {
          if (key.includes('lugar') || key.includes('naci') || key.includes('location')) {
            const value = personMeta.find(m => m.meta_key === key)?.meta_value;
            console.log(`- ${key}: ${value}`);
          }
        });
      }
    } else {
      console.log('No se encontraron personas con lugar_nacimiento 7448');
    }

    // 7. Buscar si hay una tabla custom para localidades
    console.log('\n7. BUSCANDO TABLAS CUSTOM');
    const [customTables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'wordpress_cine' 
      AND (
        TABLE_NAME LIKE '%location%' 
        OR TABLE_NAME LIKE '%lugar%'
        OR TABLE_NAME LIKE '%ciudad%'
        OR TABLE_NAME LIKE '%localidad%'
        OR TABLE_NAME LIKE '%geo%'
      )
    `);

    if (customTables.length > 0) {
      console.log('Tablas custom encontradas:');
      customTables.forEach(table => {
        console.log(`- ${table.TABLE_NAME}`);
      });
    } else {
      console.log('No se encontraron tablas custom relacionadas con localidades');
    }

    // 8. Verificar si los IDs son de otra instalación o están en otra columna
    console.log('\n8. VERIFICANDO REFERENCIAS CRUZADAS');
    
    // Buscar el ID 7448 (el más común) en toda la base
    const [references] = await connection.execute(`
      SELECT 
        'wp_postmeta' as tabla,
        meta_key as columna,
        COUNT(*) as count
      FROM wp_postmeta
      WHERE meta_value LIKE '%7448%'
      GROUP BY meta_key
      
      UNION ALL
      
      SELECT 
        'wp_posts' as tabla,
        'post_content' as columna,
        COUNT(*) as count
      FROM wp_posts
      WHERE post_content LIKE '%7448%'
      
      UNION ALL
      
      SELECT 
        'wp_options' as tabla,
        option_name as columna,
        COUNT(*) as count
      FROM wp_options
      WHERE option_value LIKE '%7448%'
    `);

    console.log('Referencias al ID 7448 encontradas en:');
    references.forEach(ref => {
      if (ref.count > 0) {
        console.log(`- ${ref.tabla}.${ref.columna}: ${ref.count} veces`);
      }
    });

  } catch (error) {
    console.error('Error durante la búsqueda:', error);
  } finally {
    await connection.end();
  }
}

// Ejecutar la búsqueda
findMysteryLocations()
  .then(() => console.log('\nBúsqueda completada'))
  .catch(console.error);