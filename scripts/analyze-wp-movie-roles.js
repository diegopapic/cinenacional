// scripts/analyze-wp-movie-roles.js

const mysql = require('mysql2/promise');
const phpUnserialize = require('php-unserialize');
require('dotenv').config({ path: '.env.local' });

// Configuración de la base de datos MySQL local
const wpConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wordpress_cine',
  port: 3306
};

async function analyzeMovieRoles(movieId) {
  let connection;
  
  try {
    connection = await mysql.createConnection(wpConfig);
    
    // Si no se proporciona ID, buscar una película con datos completos
    if (!movieId) {
      console.log('🔍 Buscando una película con datos completos...\n');
      
      const [movies] = await connection.execute(`
        SELECT p.ID, p.post_title, COUNT(pm.meta_id) as meta_count
        FROM wp_posts p
        LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
        WHERE p.post_type = 'pelicula'
          AND p.post_status = 'publish'
        GROUP BY p.ID
        ORDER BY meta_count DESC
        LIMIT 5
      `);
      
      if (movies.length > 0) {
        movieId = movies[0].ID;
        console.log(`Analizando: "${movies[0].post_title}" (ID: ${movieId})`);
        console.log(`Total de metadatos: ${movies[0].meta_count}\n`);
      } else {
        console.log('No se encontraron películas.');
        return;
      }
    }
    
    console.log('=====================================');
    console.log(`ANÁLISIS COMPLETO DE PELÍCULA ID: ${movieId}`);
    console.log('=====================================\n');
    
    // 1. Información básica de la película
    const [movie] = await connection.execute(`
      SELECT * FROM wp_posts WHERE ID = ? AND post_type = 'pelicula'
    `, [movieId]);
    
    if (movie.length === 0) {
      console.log('❌ No se encontró la película con ese ID.');
      return;
    }
    
    console.log('INFORMACIÓN BÁSICA:');
    console.log('-------------------');
    console.log(`Título: ${movie[0].post_title}`);
    console.log(`Estado: ${movie[0].post_status}`);
    console.log(`Fecha: ${movie[0].post_date}\n`);
    
    // 2. Todos los metadatos
    console.log('TODOS LOS METADATOS:');
    console.log('--------------------');
    
    const [metadata] = await connection.execute(`
      SELECT meta_key, meta_value
      FROM wp_postmeta
      WHERE post_id = ?
      ORDER BY meta_key
    `, [movieId]);
    
    const roleRelatedFields = [];
    const serializedFields = [];
    
    for (const meta of metadata) {
      // Intentar deserializar si es PHP serializado
      let displayValue = meta.meta_value;
      let isRelevant = false;
      
      if (meta.meta_value && meta.meta_value.startsWith('a:')) {
        try {
          const unserialized = phpUnserialize.unserialize(meta.meta_value);
          displayValue = JSON.stringify(unserialized, null, 2);
          serializedFields.push({ key: meta.meta_key, value: unserialized });
          
          // Verificar si contiene información de roles
          const strValue = JSON.stringify(unserialized).toLowerCase();
          if (strValue.includes('director') || 
              strValue.includes('productor') ||
              strValue.includes('guion') ||
              strValue.includes('fotograf') ||
              strValue.includes('montaje') ||
              strValue.includes('sonido') ||
              strValue.includes('role') ||
              strValue.includes('crew') ||
              strValue.includes('cargo')) {
            isRelevant = true;
            roleRelatedFields.push({ key: meta.meta_key, value: unserialized });
          }
        } catch (e) {
          // No es serializado o error
        }
      }
      
      // Buscar campos relacionados con roles por nombre
      const keyLower = meta.meta_key.toLowerCase();
      if (keyLower.includes('director') || 
          keyLower.includes('productor') ||
          keyLower.includes('guion') ||
          keyLower.includes('crew') ||
          keyLower.includes('equipo') ||
          keyLower.includes('rol') ||
          keyLower.includes('cargo')) {
        isRelevant = true;
        if (!roleRelatedFields.find(f => f.key === meta.meta_key)) {
          roleRelatedFields.push({ key: meta.meta_key, value: displayValue });
        }
      }
      
      // Mostrar el campo
      if (isRelevant) {
        console.log(`✓ ${meta.meta_key}:`);
      } else {
        console.log(`  ${meta.meta_key}:`);
      }
      
      if (displayValue && displayValue.length > 200) {
        console.log(`    ${displayValue.substring(0, 200)}...`);
      } else {
        console.log(`    ${displayValue}`);
      }
    }
    
    // 3. Taxonomías asociadas
    console.log('\nTAXONOMÍAS Y TÉRMINOS:');
    console.log('----------------------');
    
    const [taxonomies] = await connection.execute(`
      SELECT tt.taxonomy, t.name, t.slug
      FROM wp_term_relationships tr
      JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
      JOIN wp_terms t ON tt.term_id = t.term_id
      WHERE tr.object_id = ?
      ORDER BY tt.taxonomy, t.name
    `, [movieId]);
    
    let currentTaxonomy = '';
    for (const tax of taxonomies) {
      if (tax.taxonomy !== currentTaxonomy) {
        currentTaxonomy = tax.taxonomy;
        console.log(`\n${tax.taxonomy}:`);
      }
      console.log(`  - ${tax.name} (${tax.slug})`);
    }
    
    // 4. Relaciones Posts 2 Posts
    console.log('\n\nRELACIONES POSTS 2 POSTS:');
    console.log('-------------------------');
    
    // Buscar en tablas p2p
    const [p2pTables] = await connection.execute(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'wordpress_cine'
        AND TABLE_NAME LIKE '%p2p%'
    `);
    
    for (const table of p2pTables) {
      const [relations] = await connection.execute(`
        SELECT * FROM ${table.TABLE_NAME}
        WHERE p2p_from = ? OR p2p_to = ?
      `, [movieId, movieId]);
      
      if (relations.length > 0) {
        console.log(`\nTabla ${table.TABLE_NAME}:`);
        
        for (const rel of relations) {
          // Obtener información de la persona relacionada
          const personId = rel.p2p_from == movieId ? rel.p2p_to : rel.p2p_from;
          const [person] = await connection.execute(`
            SELECT post_title, post_type FROM wp_posts WHERE ID = ?
          `, [personId]);
          
          if (person.length > 0) {
            console.log(`  - ${person[0].post_title} (${person[0].post_type})`);
            
            // Buscar metadatos de la relación
            const [relMeta] = await connection.execute(`
              SELECT meta_key, meta_value
              FROM wp_p2pmeta
              WHERE p2p_id = ?
            `, [rel.p2p_id]);
            
            if (relMeta.length > 0) {
              console.log('    Metadatos de la relación:');
              relMeta.forEach(meta => {
                console.log(`      ${meta.meta_key}: ${meta.meta_value}`);
              });
            }
          }
        }
      }
    }
    
    // 5. Resumen de campos relacionados con roles
    console.log('\n\n=====================================');
    console.log('RESUMEN DE CAMPOS DE ROLES ENCONTRADOS:');
    console.log('=====================================\n');
    
    if (roleRelatedFields.length > 0) {
      console.log('Campos que probablemente contienen información de roles:');
      roleRelatedFields.forEach(field => {
        console.log(`\n✓ ${field.key}:`);
        if (typeof field.value === 'object') {
          console.log(JSON.stringify(field.value, null, 2));
        } else {
          console.log(field.value);
        }
      });
    } else {
      console.log('No se encontraron campos claramente relacionados con roles.');
      console.log('Es posible que los roles estén en:');
      console.log('- Relaciones Posts 2 Posts con metadatos');
      console.log('- Campos serializados complejos');
      console.log('- Taxonomías personalizadas');
    }
    
    // 6. Sugerencia de estructura para migración
    console.log('\n\nESTRUCTURA SUGERIDA PARA MIGRACIÓN:');
    console.log('------------------------------------');
    console.log('Basándome en la documentación del proyecto, los roles deben migrarse a:');
    console.log('- Tabla: movie_crew');
    console.log('- Campos: movieId, personId, roleId, role, department, billingOrder');
    console.log('\nPróximo paso: Crear script de migración específico para los campos encontrados.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Obtener el ID de la película desde los argumentos
const movieId = process.argv[2];

// Ejecutar el análisis
analyzeMovieRoles(movieId).catch(console.error);