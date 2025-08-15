const mysql = require('mysql2/promise');

const wpConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Ajustar según tu configuración
  database: 'wordpress_cine',
  charset: 'utf8mb4'
};

async function checkMissingParent(parentId) {
  let connection;
  
  try {
    connection = await mysql.createConnection(wpConfig);
    console.log(`\n🔍 Buscando información sobre el término padre ID: ${parentId}\n`);

    // Buscar el término padre
    const [parent] = await connection.execute(`
      SELECT 
        t.term_id,
        t.name,
        t.slug,
        tt.parent,
        tt.taxonomy,
        tt.count
      FROM wp_terms t
      JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE t.term_id = ?
    `, [parentId]);

    if (parent.length > 0) {
      console.log('✅ Término padre encontrado:');
      console.log(parent[0]);
      
      // Si este padre también tiene un padre, buscarlo
      if (parent[0].parent > 0) {
        console.log(`\n🔍 Este término tiene un abuelo (parent: ${parent[0].parent}), buscando...`);
        const [grandparent] = await connection.execute(`
          SELECT t.term_id, t.name, t.slug, tt.parent
          FROM wp_terms t
          JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
          WHERE t.term_id = ?
        `, [parent[0].parent]);
        
        if (grandparent.length > 0) {
          console.log('👴 Abuelo encontrado:', grandparent[0]);
        }
      }
    } else {
      console.log('❌ No se encontró el término padre en la base de datos');
    }

    // Buscar todos los hijos de este padre
    console.log(`\n👶 Buscando hijos del término ${parentId}...`);
    const [children] = await connection.execute(`
      SELECT t.name, t.slug, t.term_id
      FROM wp_terms t
      JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.parent = ?
      AND tt.taxonomy = 'localidad'
      ORDER BY t.name
    `, [parentId]);

    if (children.length > 0) {
      console.log(`\nEncontrados ${children.length} hijos:`);
      children.forEach(child => {
        console.log(`  - ${child.name} (ID: ${child.term_id}, slug: ${child.slug})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar para el ID problemático
checkMissingParent(11381);