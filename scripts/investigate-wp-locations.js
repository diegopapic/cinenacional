// scripts/investigate-wp-locations.js
// Script para investigar dónde están realmente las ubicaciones en WordPress

const mysql = require('mysql2/promise');

async function createConnection() {
  return await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'wordpress_cine',
    charset: 'utf8mb4'
  });
}

async function investigateLocations() {
  console.log('=== INVESTIGANDO UBICACIONES REALES EN WORDPRESS ===\n');

  let wpConnection;
  
  try {
    wpConnection = await createConnection();
    console.log('✅ Conectado a MySQL\n');

    // 1. Buscar todos los post_types únicos
    console.log('📋 1. BUSCANDO TODOS LOS POST TYPES\n');
    
    const [postTypes] = await wpConnection.execute(`
      SELECT DISTINCT post_type, COUNT(*) as cantidad
      FROM wp_posts
      WHERE post_status IN ('publish', 'draft', 'private')
      GROUP BY post_type
      ORDER BY cantidad DESC
    `);

    console.log('Post types encontrados:');
    postTypes.forEach(row => {
      console.log(`  • ${row.post_type}: ${row.cantidad} posts`);
    });

    // 2. Buscar post types que podrían ser ubicaciones
    console.log('\n🌍 2. BUSCANDO POST TYPES DE UBICACIONES\n');
    
    const locationKeywords = ['location', 'lugar', 'city', 'ciudad', 'country', 'pais', 'provincia', 'state'];
    
    for (const keyword of locationKeywords) {
      const [results] = await wpConnection.execute(`
        SELECT DISTINCT post_type, COUNT(*) as cantidad
        FROM wp_posts
        WHERE post_type LIKE ?
        GROUP BY post_type
      `, [`%${keyword}%`]);
      
      if (results.length > 0) {
        console.log(`Encontrados con "${keyword}":`);
        results.forEach(row => {
          console.log(`  • ${row.post_type}: ${row.cantidad} posts`);
        });
      }
    }

    // 3. Buscar taxonomías
    console.log('\n🏷️ 3. BUSCANDO TODAS LAS TAXONOMÍAS\n');
    
    const [taxonomies] = await wpConnection.execute(`
      SELECT DISTINCT taxonomy, COUNT(*) as cantidad
      FROM wp_term_taxonomy
      GROUP BY taxonomy
      ORDER BY cantidad DESC
    `);

    console.log('Taxonomías encontradas:');
    taxonomies.forEach(row => {
      console.log(`  • ${row.taxonomy}: ${row.cantidad} términos`);
    });

    // 4. Buscar taxonomías que podrían ser ubicaciones
    console.log('\n🗺️ 4. BUSCANDO TAXONOMÍAS DE UBICACIONES\n');
    
    for (const keyword of locationKeywords) {
      const [taxResults] = await wpConnection.execute(`
        SELECT DISTINCT taxonomy, COUNT(*) as cantidad
        FROM wp_term_taxonomy
        WHERE taxonomy LIKE ?
        GROUP BY taxonomy
      `, [`%${keyword}%`]);
      
      if (taxResults.length > 0) {
        console.log(`Taxonomías con "${keyword}":`);
        taxResults.forEach(row => {
          console.log(`  • ${row.taxonomy}: ${row.cantidad} términos`);
          
          // Mostrar algunos ejemplos
          wpConnection.execute(`
            SELECT t.name
            FROM wp_terms t
            JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
            WHERE tt.taxonomy = ?
            LIMIT 5
          `, [row.taxonomy]).then(([examples]) => {
            if (examples.length > 0) {
              console.log('    Ejemplos:');
              examples.forEach(ex => {
                console.log(`      - ${ex.name}`);
              });
            }
          });
        });
      }
    }

    // 5. Verificar qué son realmente esos IDs
    console.log('\n🔍 5. VERIFICANDO QUÉ SON LOS IDs ENCONTRADOS\n');
    
    const knownLocationIds = [11229, 11270, 12508, 11721, 12043];
    
    for (const id of knownLocationIds) {
      const [post] = await wpConnection.execute(`
        SELECT 
          ID,
          post_title,
          post_type,
          post_status,
          post_parent,
          post_content
        FROM wp_posts
        WHERE ID = ?
      `, [id]);
      
      if (post.length > 0) {
        console.log(`\nID ${id}:`);
        console.log(`  Título: ${post[0].post_title}`);
        console.log(`  Tipo: ${post[0].post_type}`);
        console.log(`  Estado: ${post[0].post_status}`);
        
        if (post[0].post_parent > 0) {
          const [parent] = await wpConnection.execute(
            'SELECT post_title, post_type FROM wp_posts WHERE ID = ?',
            [post[0].post_parent]
          );
          if (parent.length > 0) {
            console.log(`  Parent: ${parent[0].post_title} (${parent[0].post_type})`);
          }
        }
        
        // Si es attachment, ver el guid (URL)
        if (post[0].post_type === 'attachment') {
          const [guid] = await wpConnection.execute(
            'SELECT guid FROM wp_posts WHERE ID = ?',
            [id]
          );
          if (guid.length > 0) {
            console.log(`  URL: ${guid[0].guid}`);
          }
        }
      }
    }

    // 6. Buscar en wp_terms si hay ubicaciones
    console.log('\n📍 6. BUSCANDO UBICACIONES EN WP_TERMS\n');
    
    const locationNames = ['Argentina', 'Buenos Aires', 'París', 'Madrid', 'México', 'Chile', 'Uruguay'];
    
    for (const location of locationNames) {
      const [terms] = await wpConnection.execute(`
        SELECT 
          t.term_id,
          t.name,
          t.slug,
          tt.taxonomy,
          tt.parent,
          tt.count
        FROM wp_terms t
        JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
        WHERE t.name LIKE ?
        ORDER BY tt.count DESC
        LIMIT 5
      `, [`%${location}%`]);
      
      if (terms.length > 0) {
        console.log(`\n"${location}" encontrado en términos:`);
        terms.forEach(term => {
          console.log(`  ID: ${term.term_id}, Taxonomía: ${term.taxonomy}, Usos: ${term.count}`);
          
          // Si tiene parent, mostrarlo
          if (term.parent > 0) {
            wpConnection.execute(
              'SELECT name FROM wp_terms WHERE term_id = ?',
              [term.parent]
            ).then(([parent]) => {
              if (parent.length > 0) {
                console.log(`    └─ Parent: ${parent[0].name}`);
              }
            });
          }
        });
      }
    }

    // 7. Buscar tablas custom
    console.log('\n🔧 7. BUSCANDO TABLAS CUSTOM\n');
    
    const [tables] = await wpConnection.execute(`
      SHOW TABLES LIKE '%location%'
    `);
    
    if (tables.length > 0) {
      console.log('Tablas con "location":');
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`  • ${tableName}`);
      });
    }
    
    const [tables2] = await wpConnection.execute(`
      SHOW TABLES LIKE '%lugar%'
    `);
    
    if (tables2.length > 0) {
      console.log('Tablas con "lugar":');
      tables2.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`  • ${tableName}`);
      });
    }

    // 8. Revisar ACF (Advanced Custom Fields) si existe
    console.log('\n🔌 8. VERIFICANDO ADVANCED CUSTOM FIELDS\n');
    
    const [acfFields] = await wpConnection.execute(`
      SELECT DISTINCT meta_key, COUNT(*) as cantidad
      FROM wp_postmeta
      WHERE meta_key LIKE '_field_%'
      GROUP BY meta_key
      ORDER BY cantidad DESC
      LIMIT 20
    `);
    
    if (acfFields.length > 0) {
      console.log('Campos ACF encontrados (top 20):');
      acfFields.forEach(field => {
        console.log(`  • ${field.meta_key}: ${field.cantidad} usos`);
      });
    }

    console.log('\n✅ INVESTIGACIÓN COMPLETADA');
    console.log('\n💡 Basándonos en estos resultados, podremos determinar dónde están realmente las ubicaciones');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (wpConnection) {
      await wpConnection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  investigateLocations().catch(console.error);
}

module.exports = { investigateLocations };