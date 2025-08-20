// scripts/analyze-wp-roles-storage.js

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const wpConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wordpress_cine',
  port: 3306
};

async function analyzeRoleStorage() {
  let connection;
  
  try {
    connection = await mysql.createConnection(wpConfig);
    
    // Buscar una película que tenga datos de crew
    const [movies] = await connection.execute(`
      SELECT DISTINCT p.ID, p.post_title
      FROM wp_posts p
      JOIN wp_postmeta pm ON p.ID = pm.post_id
      WHERE p.post_type = 'pelicula'
        AND pm.meta_key LIKE 'ficha_tecnica_%_rol'
      LIMIT 1
    `);
    
    if (movies.length === 0) {
      console.log('No se encontraron películas con roles');
      return;
    }
    
    const movieId = movies[0].ID;
    console.log(`\n🎬 Analizando película: "${movies[0].post_title}" (ID: ${movieId})\n`);
    console.log('=' .repeat(80));
    
    // Obtener TODOS los campos de ficha técnica para esta película
    const [metadata] = await connection.execute(`
      SELECT meta_key, meta_value
      FROM wp_postmeta
      WHERE post_id = ?
        AND (
          meta_key LIKE 'ficha_tecnica_%_rol'
          OR meta_key LIKE 'ficha_tecnica_%_persona'
          OR meta_key LIKE 'ficha_tecnica_%_comentario'
          OR meta_key LIKE 'ficha_tecnica_%_acreditado_con_su'
        )
      ORDER BY meta_key
    `, [movieId]);
    
    // Organizar por departamento
    const departments = {};
    
    for (const row of metadata) {
      // Extraer departamento e índice del meta_key
      // Ejemplo: ficha_tecnica_fotografia_0_rol -> dept: fotografia, index: 0, field: rol
      const match = row.meta_key.match(/ficha_tecnica_([^_]+)(?:_import)?_(\d+)_(.+)/);
      
      if (match) {
        const [, dept, index, field] = match;
        
        if (!departments[dept]) {
          departments[dept] = {};
        }
        
        if (!departments[dept][index]) {
          departments[dept][index] = {};
        }
        
        departments[dept][index][field] = row.meta_value;
      }
    }
    
    // Mostrar los datos organizados
    for (const [dept, entries] of Object.entries(departments)) {
      console.log(`\n📁 DEPARTAMENTO: ${dept.toUpperCase()}`);
      console.log('-'.repeat(40));
      
      for (const [index, fields] of Object.entries(entries)) {
        console.log(`\n  Entrada #${index}:`);
        
        if (fields.rol) {
          console.log(`    🎭 Rol: "${fields.rol}"`);
        }
        
        if (fields.persona) {
          // Buscar el nombre de la persona
          const [person] = await connection.execute(`
            SELECT post_title FROM wp_posts WHERE ID = ? AND post_type = 'persona'
          `, [fields.persona]);
          
          const personName = person[0]?.post_title || 'ID: ' + fields.persona;
          console.log(`    👤 Persona: ${personName}`);
        }
        
        if (fields.acreditado_con_su) {
          console.log(`    📝 Acreditado: ${fields.acreditado_con_su}`);
        }
        
        if (fields.comentario) {
          console.log(`    💬 Comentario: ${fields.comentario}`);
        }
      }
    }
    
    // Mostrar los registros crudos para mayor claridad
    console.log('\n' + '='.repeat(80));
    console.log('REGISTROS CRUDOS EN wp_postmeta:');
    console.log('='.repeat(80));
    console.log('\npost_id | meta_key | meta_value');
    console.log('-'.repeat(80));
    
    metadata.slice(0, 20).forEach(row => {
      console.log(`${movieId} | ${row.meta_key} | ${row.meta_value}`);
    });
    
    if (metadata.length > 20) {
      console.log(`... y ${metadata.length - 20} registros más`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

analyzeRoleStorage();