const mysql = require('mysql2/promise');
const fs = require('fs').promises;

// ============================================
// CONFIGURACIÓN
// ============================================

const CONFIG_MYSQL = {
  host: '127.0.0.1',
  user: 'root',           // ← Tu usuario de MySQL local
  password: '',           // ← Tu password de MySQL local
  database: 'wordpress_cine',
  port: 3306
};

const CONFIG = {
  outputCSV: 'wp_posts_imagen_destacada.csv'
};

// ============================================
// PROCESO
// ============================================

async function extraerFaltantes() {
  console.log('🔍 Conectando a MySQL...\n');
  
  let connection;
  
  try {
    connection = await mysql.createConnection(CONFIG_MYSQL);
    console.log('✓ Conectado a MySQL\n');
    
    console.log('📊 Extrayendo películas con solo imagen_destacada...');
    
    // Query optimizado: usar índices y evitar subconsultas correlacionadas
    const query = `
      SELECT 
        p.ID as pelicula_id,
        p.post_title as pelicula_titulo,
        pm_img.meta_value as attachment_id,
        att.guid as imagen_url,
        SUBSTRING_INDEX(att.guid, '/', -1) as nombre_archivo
      FROM wp_posts p
      INNER JOIN wp_postmeta pm_img 
        ON p.ID = pm_img.post_id 
        AND pm_img.meta_key = 'imagen_destacada'
        AND pm_img.meta_value != ''
      LEFT JOIN wp_postmeta pm_thumb 
        ON p.ID = pm_thumb.post_id 
        AND pm_thumb.meta_key = '_thumbnail_id'
      LEFT JOIN wp_posts att 
        ON pm_img.meta_value = att.ID
      WHERE p.post_type = 'pelicula'
        AND p.post_status = 'publish'
        AND pm_thumb.post_id IS NULL
      ORDER BY p.ID
    `;
    
    const [rows] = await connection.execute(query);
    
    console.log(`✓ Encontradas ${rows.length} películas\n`);
    
    if (rows.length === 0) {
      console.log('⚠️  No hay películas para procesar.');
      return;
    }
    
    // Generar CSV
    const csvLines = [
      '"pelicula_id","pelicula_titulo","attachment_id","imagen_url","nombre_archivo"'
    ];
    
    rows.forEach(row => {
      const titulo = (row.pelicula_titulo || '').replace(/"/g, '""');
      const url = row.imagen_url || '';
      const nombre = row.nombre_archivo || '';
      
      csvLines.push(
        `"${row.pelicula_id}","${titulo}","${row.attachment_id}","${url}","${nombre}"`
      );
    });
    
    // Guardar CSV
    await fs.writeFile(CONFIG.outputCSV, csvLines.join('\n'), 'utf8');
    
    console.log(`✓ CSV generado: ${CONFIG.outputCSV}`);
    console.log(`  Total de películas: ${rows.length}\n`);
    
    // Mostrar algunos ejemplos
    console.log('📝 Primeras 5 películas:');
    rows.slice(0, 5).forEach((row, i) => {
      console.log(`  ${i + 1}. ID ${row.pelicula_id}: ${row.pelicula_titulo}`);
      console.log(`     URL: ${row.imagen_url}\n`);
    });
    
    // Analizar dominios
    const conNuevo = rows.filter(r => r.imagen_url && r.imagen_url.includes('nuevo.cinenacional.com')).length;
    const conSinNuevo = rows.filter(r => r.imagen_url && r.imagen_url.includes('cinenacional.com') && !r.imagen_url.includes('nuevo')).length;
    const otros = rows.length - conNuevo - conSinNuevo;
    
    console.log('🔍 Análisis de URLs:');
    console.log(`  http://nuevo.cinenacional.com/: ${conNuevo}`);
    console.log(`  https://cinenacional.com/:       ${conSinNuevo}`);
    console.log(`  Otros/vacíos:                    ${otros}\n`);
    
    console.log('💡 Siguiente paso:');
    console.log('   1. Revisa el CSV generado');
    console.log('   2. Ejecuta: node upload-posters-to-cloudinary.js');
    console.log(`      (con inputCSV: '${CONFIG.outputCSV}')`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Verifica que MySQL esté corriendo en el puerto 3306');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Verifica usuario y contraseña de MySQL');
    }
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✓ Conexión cerrada');
    }
  }
}

// ============================================
// EJECUTAR
// ============================================

extraerFaltantes();