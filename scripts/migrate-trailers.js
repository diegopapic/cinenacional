/**
 * Script de Migración: Trailers de Películas
 * WordPress (MySQL) -> PostgreSQL (Docker)
 * 
 * Migra URLs de trailers almacenados en el campo ACF 'videos_0_video'
 * desde wp_postmeta a la columna trailer_url en la tabla movies
 */

const mysql = require('mysql2/promise');
const { Client } = require('pg');

// Configuración de conexiones
const CONFIG = {
  wordpress: {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine',
    charset: 'utf8mb4'
  },
  postgres: {
    host: 'localhost',
    port: 5433,
    database: 'cinenacional',
    user: 'cinenacional',
    password: 'Paganitzu'
  }
};

/**
 * Deserializa un string PHP serializado y extrae la URL del video
 * Formato esperado: a:3:{s:5:"title";s:7:"Trailer";s:3:"url";s:28:"https://youtu.be/XXX";s:6:"target";s:0:"";}
 * 
 * @param {string} serialized - String serializado de PHP
 * @returns {Object|null} Objeto con title, url y target, o null si falla
 */
function deserializePhpVideo(serialized) {
  if (!serialized || typeof serialized !== 'string') {
    return null;
  }

  try {
    // Método 1: Usar regex para extraer los valores directamente
    // Esto es más robusto que intentar parsear el formato serializado completo
    
    // Extraer URL (busca el patrón "url";s:XX:"...URL...")
    const urlMatch = serialized.match(/"url";s:\d+:"([^"]+)"/);
    const titleMatch = serialized.match(/"title";s:\d+:"([^"]+)"/);
    const targetMatch = serialized.match(/"target";s:\d+:"([^"]*)"/);
    
    if (urlMatch && urlMatch[1]) {
      return {
        title: titleMatch ? titleMatch[1] : null,
        url: urlMatch[1],
        target: targetMatch ? targetMatch[1] : null
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error deserializando:', error.message);
    return null;
  }
}

/**
 * Normaliza una URL de YouTube a un formato consistente
 * Convierte youtu.be/XXX a https://www.youtube.com/watch?v=XXX
 * 
 * @param {string} url - URL del video
 * @returns {string} URL normalizada
 */
function normalizeYoutubeUrl(url) {
  if (!url) return null;
  
  // Si es youtu.be/XXX, convertir a formato largo
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) {
    return `https://www.youtube.com/watch?v=${shortMatch[1]}`;
  }
  
  // Si ya es youtube.com, asegurar que tenga https
  if (url.includes('youtube.com')) {
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    if (!url.startsWith('https://')) {
      return 'https://' + url;
    }
  }
  
  // Para otras URLs (Vimeo, etc.), mantener como está
  return url;
}

/**
 * Función principal de migración
 */
async function migrateTrailers() {
  let mysqlConn = null;
  let pgClient = null;
  
  const stats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    alreadyHasTrailer: 0,
    movieNotFound: 0,
    parseErrors: 0,
    errors: 0,
    details: []
  };
  
  try {
    console.log('🎬 MIGRACIÓN DE TRAILERS\n');
    console.log('='.repeat(60));
    
    // Conectar a WordPress MySQL
    console.log('\n🔌 Conectando a MySQL (WordPress)...');
    mysqlConn = await mysql.createConnection(CONFIG.wordpress);
    console.log('✅ MySQL conectado');
    
    // Conectar a PostgreSQL
    console.log('🔌 Conectando a PostgreSQL (Docker)...');
    pgClient = new Client(CONFIG.postgres);
    await pgClient.connect();
    console.log('✅ PostgreSQL conectado\n');
    
    // Paso 1: Obtener todos los videos de películas
    console.log('📋 Obteniendo trailers de WordPress...');
    const [videos] = await mysqlConn.execute(
      `SELECT 
        pm.post_id,
        pm.meta_value as video_data,
        p.post_title
       FROM wp_postmeta pm
       JOIN wp_posts p ON pm.post_id = p.ID
       WHERE p.post_type = 'pelicula'
         AND p.post_status = 'publish'
         AND pm.meta_key = 'videos_0_video'
         AND pm.meta_value IS NOT NULL
         AND pm.meta_value != ''
       ORDER BY pm.post_id`
    );
    
    console.log(`✅ Encontrados ${videos.length} registros de video\n`);
    stats.total = videos.length;
    
    // Paso 2: Procesar cada video
    console.log('🎬 Procesando trailers...\n');
    
    for (const video of videos) {
      const postId = video.post_id;
      const postTitle = video.post_title;
      
      try {
        // Deserializar el campo de video
        const videoData = deserializePhpVideo(video.video_data);
        
        if (!videoData || !videoData.url) {
          console.log(`   ⚠️  Post ${postId}: No se pudo extraer URL - SALTADO`);
          stats.parseErrors++;
          stats.details.push({
            postId,
            title: postTitle,
            status: 'parse_error',
            rawData: video.video_data.substring(0, 100)
          });
          continue;
        }
        
        // Normalizar la URL
        const normalizedUrl = normalizeYoutubeUrl(videoData.url);
        
        // Buscar la película en PostgreSQL por ID
        const movieResult = await pgClient.query(
          'SELECT id, title, trailer_url FROM movies WHERE id = $1',
          [postId]
        );
        
        if (movieResult.rows.length === 0) {
          console.log(`   ⚠️  Post ${postId} (${postTitle}): Película no encontrada en PostgreSQL`);
          stats.movieNotFound++;
          stats.details.push({
            postId,
            title: postTitle,
            status: 'movie_not_found',
            url: normalizedUrl
          });
          continue;
        }
        
        const movie = movieResult.rows[0];
        
        // Verificar si ya tiene trailer
        if (movie.trailer_url && movie.trailer_url.trim() !== '') {
          console.log(`   ℹ️  ID ${postId} (${movie.title}): Ya tiene trailer - SALTADO`);
          stats.alreadyHasTrailer++;
          stats.details.push({
            postId,
            movieId: movie.id,
            title: movie.title,
            status: 'already_has_trailer',
            existingUrl: movie.trailer_url,
            newUrl: normalizedUrl
          });
          continue;
        }
        
        // Actualizar la película con la URL del trailer
        await pgClient.query(
          'UPDATE movies SET trailer_url = $1, updated_at = NOW() WHERE id = $2',
          [normalizedUrl, movie.id]
        );
        
        console.log(`   ✅ ID ${movie.id} (${movie.title}): ${normalizedUrl}`);
        stats.migrated++;
        stats.details.push({
          postId,
          movieId: movie.id,
          title: movie.title,
          status: 'success',
          url: normalizedUrl,
          originalUrl: videoData.url
        });
        
      } catch (error) {
        console.error(`   ❌ Error procesando post ${postId}:`, error.message);
        stats.errors++;
        stats.details.push({
          postId,
          title: postTitle,
          status: 'error',
          error: error.message
        });
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error general:', error);
    throw error;
  } finally {
    // Cerrar conexiones
    if (mysqlConn) {
      await mysqlConn.end();
      console.log('\n🔌 Conexión MySQL cerrada');
    }
    if (pgClient) {
      await pgClient.end();
      console.log('🔌 Conexión PostgreSQL cerrada');
    }
  }
  
  // Mostrar estadísticas finales
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE MIGRACIÓN DE TRAILERS');
  console.log('='.repeat(60));
  console.log(`Total de videos procesados:      ${stats.total}`);
  console.log(`✅ Migrados exitosamente:        ${stats.migrated}`);
  console.log(`ℹ️  Ya tenían trailer:            ${stats.alreadyHasTrailer}`);
  console.log(`⚠️  Película no encontrada:      ${stats.movieNotFound}`);
  console.log(`⚠️  Error al parsear:            ${stats.parseErrors}`);
  console.log(`❌ Errores:                      ${stats.errors}`);
  console.log('='.repeat(60));
  
  // Calcular porcentaje de éxito
  const successRate = stats.total > 0 
    ? ((stats.migrated / stats.total) * 100).toFixed(1) 
    : 0;
  console.log(`\n📈 Tasa de migración: ${successRate}%`);
  
  // Guardar reporte detallado
  const fs = require('fs');
  const reportPath = './migration-trailers-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
  console.log(`\n📄 Reporte detallado guardado en: ${reportPath}`);
  
  return stats;
}

/**
 * Modo de prueba: solo muestra qué haría sin modificar la base de datos
 */
async function dryRun() {
  let mysqlConn = null;
  
  try {
    console.log('🔌 Conectando a WordPress MySQL...');
    mysqlConn = await mysql.createConnection(CONFIG.wordpress);
    console.log('✅ Conectado a WordPress\n');
    
    console.log('📋 MODO DRY RUN: Mostrando primeros 20 trailers que se migrarían\n');
    
    const [videos] = await mysqlConn.execute(
      `SELECT 
        pm.post_id,
        pm.meta_value as video_data,
        p.post_title
       FROM wp_postmeta pm
       JOIN wp_posts p ON pm.post_id = p.ID
       WHERE p.post_type = 'pelicula'
         AND p.post_status = 'publish'
         AND pm.meta_key = 'videos_0_video'
         AND pm.meta_value IS NOT NULL
         AND pm.meta_value != ''
       ORDER BY pm.post_id
       LIMIT 20`
    );
    
    console.log('Películas y sus trailers:\n');
    
    for (const video of videos) {
      const videoData = deserializePhpVideo(video.video_data);
      
      if (videoData && videoData.url) {
        const normalizedUrl = normalizeYoutubeUrl(videoData.url);
        console.log(`ID ${video.post_id}: ${video.post_title}`);
        console.log(`   Original: ${videoData.url}`);
        console.log(`   Normalizado: ${normalizedUrl}`);
        console.log(`   Título video: ${videoData.title || 'N/A'}`);
        console.log('');
      } else {
        console.log(`ID ${video.post_id}: ${video.post_title}`);
        console.log(`   ⚠️ No se pudo parsear: ${video.video_data.substring(0, 80)}...`);
        console.log('');
      }
    }
    
  } finally {
    if (mysqlConn) {
      await mysqlConn.end();
      console.log('🔌 Conexión MySQL cerrada');
    }
  }
}

// Ejecutar según el argumento
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--dry-run') || args.includes('-d')) {
    console.log('🔍 Ejecutando en modo DRY RUN (sin cambios)\n');
    dryRun()
      .then(() => {
        console.log('\n✅ Dry run completado');
        process.exit(0);
      })
      .catch(error => {
        console.error('\n❌ Error:', error);
        process.exit(1);
      });
  } else {
    console.log('🚀 Ejecutando migración de trailers\n');
    console.log('💡 Tip: Usa --dry-run para ver qué se migraría sin hacer cambios\n');
    
    migrateTrailers()
      .then(stats => {
        console.log('\n✅ Migración completada');
        process.exit(stats.errors > 0 ? 1 : 0);
      })
      .catch(error => {
        console.error('\n❌ Error fatal:', error);
        process.exit(1);
      });
  }
}

module.exports = { migrateTrailers, dryRun, deserializePhpVideo, normalizeYoutubeUrl };