/**
 * Script de Investigación: URLs de Trailers en WordPress
 * 
 * Analiza la base de datos de WordPress para encontrar dónde se almacenan
 * las URLs de los trailers de las películas.
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

// Configuración de conexión a WordPress MySQL (igual que el script de referencia)
const wpConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Ajusta si tienes password
  database: 'wordpress_cine',
  charset: 'utf8mb4'
};

async function investigateTrailers() {
  let connection;
  
  try {
    console.log('🔌 Conectando a WordPress MySQL...');
    connection = await mysql.createConnection(wpConfig);
    console.log('✅ Conectado a WordPress\n');
    
    // ========================================
    // PARTE 1: Buscar meta_keys relacionados con trailers/videos
    // ========================================
    console.log('=' .repeat(80));
    console.log('📋 PARTE 1: Buscando meta_keys relacionados con trailers/videos');
    console.log('=' .repeat(80));
    
    const searchTerms = ['trailer', 'video', 'youtube', 'vimeo', 'embed', 'url_video', 'enlace'];
    
    for (const term of searchTerms) {
      console.log(`\n🔍 Buscando meta_keys que contengan "${term}"...`);
      
      const [rows] = await connection.execute(
        `SELECT DISTINCT meta_key, COUNT(*) as count
         FROM wp_postmeta pm
         JOIN wp_posts p ON pm.post_id = p.ID
         WHERE p.post_type = 'pelicula'
           AND (meta_key LIKE ? OR meta_value LIKE ?)
         GROUP BY meta_key
         ORDER BY count DESC`,
        [`%${term}%`, `%${term}%`]
      );
      
      if (rows.length > 0) {
        console.log(`   ✅ Encontrados ${rows.length} meta_keys:`);
        rows.forEach(row => {
          console.log(`      - ${row.meta_key} (${row.count} registros)`);
        });
      } else {
        console.log(`   ⚠️  No se encontraron resultados`);
      }
    }
    
    // ========================================
    // PARTE 2: Listar TODOS los meta_keys únicos de películas
    // ========================================
    console.log('\n' + '=' .repeat(80));
    console.log('📋 PARTE 2: Todos los meta_keys únicos de películas (top 100)');
    console.log('=' .repeat(80));
    
    const [allMetaKeys] = await connection.execute(
      `SELECT meta_key, COUNT(*) as count
       FROM wp_postmeta pm
       JOIN wp_posts p ON pm.post_id = p.ID
       WHERE p.post_type = 'pelicula'
       GROUP BY meta_key
       ORDER BY count DESC
       LIMIT 100`
    );
    
    console.log(`\nTotal de meta_keys únicos encontrados: ${allMetaKeys.length}`);
    console.log('\nListado completo:');
    allMetaKeys.forEach((row, index) => {
      console.log(`   ${(index + 1).toString().padStart(3)}. ${row.meta_key.padEnd(50)} (${row.count} registros)`);
    });
    
    // ========================================
    // PARTE 3: Buscar valores que parezcan URLs de video
    // ========================================
    console.log('\n' + '=' .repeat(80));
    console.log('📋 PARTE 3: Buscando valores que parezcan URLs de video');
    console.log('=' .repeat(80));
    
    const urlPatterns = [
      { name: 'YouTube', pattern: '%youtube.com%' },
      { name: 'YouTube corto', pattern: '%youtu.be%' },
      { name: 'Vimeo', pattern: '%vimeo.com%' },
      { name: 'Embed genérico', pattern: '%/embed/%' },
      { name: 'Watch video', pattern: '%watch?v=%' }
    ];
    
    for (const urlPattern of urlPatterns) {
      console.log(`\n🔍 Buscando URLs de ${urlPattern.name}...`);
      
      const [rows] = await connection.execute(
        `SELECT DISTINCT meta_key, COUNT(*) as count
         FROM wp_postmeta pm
         JOIN wp_posts p ON pm.post_id = p.ID
         WHERE p.post_type = 'pelicula'
           AND meta_value LIKE ?
         GROUP BY meta_key
         ORDER BY count DESC`,
        [urlPattern.pattern]
      );
      
      if (rows.length > 0) {
        console.log(`   ✅ Encontrados en ${rows.length} meta_keys:`);
        rows.forEach(row => {
          console.log(`      - ${row.meta_key} (${row.count} registros)`);
        });
        
        // Mostrar ejemplos del primer meta_key encontrado
        if (rows[0]) {
          const [examples] = await connection.execute(
            `SELECT pm.post_id, pm.meta_value, p.post_title
             FROM wp_postmeta pm
             JOIN wp_posts p ON pm.post_id = p.ID
             WHERE p.post_type = 'pelicula'
               AND pm.meta_key = ?
               AND pm.meta_value LIKE ?
             LIMIT 5`,
            [rows[0].meta_key, urlPattern.pattern]
          );
          
          if (examples.length > 0) {
            console.log(`\n      📌 Ejemplos de "${rows[0].meta_key}":`);
            examples.forEach(ex => {
              console.log(`         Post ${ex.post_id}: ${ex.post_title}`);
              console.log(`         URL: ${ex.meta_value.substring(0, 100)}${ex.meta_value.length > 100 ? '...' : ''}`);
            });
          }
        }
      } else {
        console.log(`   ⚠️  No se encontraron URLs de ${urlPattern.name}`);
      }
    }
    
    // ========================================
    // PARTE 4: Analizar ACF fields que podrían contener trailers
    // ========================================
    console.log('\n' + '=' .repeat(80));
    console.log('📋 PARTE 4: Buscando campos ACF relacionados con media');
    console.log('=' .repeat(80));
    
    // Los campos ACF suelen tener un meta_key que empieza con _ para la referencia
    const [acfFields] = await connection.execute(
      `SELECT DISTINCT meta_key
       FROM wp_postmeta pm
       JOIN wp_posts p ON pm.post_id = p.ID
       WHERE p.post_type = 'pelicula'
         AND meta_key NOT LIKE '\\_%'
         AND (
           meta_key LIKE '%video%' OR
           meta_key LIKE '%trailer%' OR
           meta_key LIKE '%media%' OR
           meta_key LIKE '%youtube%' OR
           meta_key LIKE '%url%' OR
           meta_key LIKE '%link%' OR
           meta_key LIKE '%enlace%'
         )
       ORDER BY meta_key`
    );
    
    if (acfFields.length > 0) {
      console.log(`\n✅ Campos ACF potencialmente relacionados con video:`);
      
      for (const field of acfFields) {
        // Contar registros y mostrar ejemplo
        const [countResult] = await connection.execute(
          `SELECT COUNT(*) as count
           FROM wp_postmeta pm
           JOIN wp_posts p ON pm.post_id = p.ID
           WHERE p.post_type = 'pelicula'
             AND meta_key = ?
             AND meta_value != ''
             AND meta_value IS NOT NULL`,
          [field.meta_key]
        );
        
        const [example] = await connection.execute(
          `SELECT pm.meta_value, p.post_title
           FROM wp_postmeta pm
           JOIN wp_posts p ON pm.post_id = p.ID
           WHERE p.post_type = 'pelicula'
             AND meta_key = ?
             AND meta_value != ''
             AND meta_value IS NOT NULL
           LIMIT 1`,
          [field.meta_key]
        );
        
        console.log(`\n   📌 ${field.meta_key} (${countResult[0].count} registros con valor)`);
        if (example.length > 0) {
          console.log(`      Ejemplo: ${example[0].meta_value.substring(0, 100)}${example[0].meta_value.length > 100 ? '...' : ''}`);
          console.log(`      Película: ${example[0].post_title}`);
        }
      }
    }
    
    // ========================================
    // PARTE 5: Estadísticas finales
    // ========================================
    console.log('\n' + '=' .repeat(80));
    console.log('📊 ESTADÍSTICAS FINALES');
    console.log('=' .repeat(80));
    
    const [totalPeliculas] = await connection.execute(
      `SELECT COUNT(*) as count FROM wp_posts WHERE post_type = 'pelicula' AND post_status = 'publish'`
    );
    
    console.log(`\nTotal de películas publicadas: ${totalPeliculas[0].count}`);
    
    // Buscar específicamente campos que podrían ser trailer
    const possibleTrailerFields = ['trailer', 'trailer_url', 'video_url', 'youtube_url', 'trailerUrl', 'url_trailer'];
    
    console.log('\n🎬 Verificando campos específicos de trailer:');
    for (const fieldName of possibleTrailerFields) {
      const [result] = await connection.execute(
        `SELECT COUNT(*) as count
         FROM wp_postmeta pm
         JOIN wp_posts p ON pm.post_id = p.ID
         WHERE p.post_type = 'pelicula'
           AND meta_key = ?
           AND meta_value != ''
           AND meta_value IS NOT NULL`,
        [fieldName]
      );
      
      if (result[0].count > 0) {
        console.log(`   ✅ ${fieldName}: ${result[0].count} registros`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Desconectado de WordPress');
    }
  }
}

// Ejecutar investigación
if (require.main === module) {
  investigateTrailers()
    .then(() => {
      console.log('\n✅ Investigación completada');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { investigateTrailers };