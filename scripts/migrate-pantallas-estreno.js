const mysql = require('mysql2/promise');
const { Client } = require('pg');

// ============================================
// SCRIPT DE MIGRACIÓN: PANTALLAS DE ESTRENO
// WordPress MySQL → PostgreSQL (Docker)
// ============================================

const CONFIG = {
  wordpress: {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  },
  postgres: {
    host: 'localhost',
    port: 5433,
    database: 'cinenacional',
    user: 'cinenacional',
    password: 'Paganitzu'
  }
};

// Función para generar slug
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9]+/g, '-')     // Reemplazar caracteres especiales
    .replace(/^-|-$/g, '');           // Eliminar guiones al inicio/final
}

async function migratePantallasEstreno() {
  let mysqlConn = null;
  let pgClient = null;

  try {
    console.log('🎬 MIGRACIÓN DE PANTALLAS DE ESTRENO\n');
    console.log('='.repeat(60));

    // ============================================
    // PASO 1: CONECTAR A BASES DE DATOS
    // ============================================
    console.log('\n📡 PASO 1: Conectando a bases de datos...\n');

    // Conectar a WordPress MySQL
    console.log('   → Conectando a MySQL (WordPress)...');
    mysqlConn = await mysql.createConnection(CONFIG.wordpress);
    console.log('   ✅ MySQL conectado');

    // Conectar a PostgreSQL
    console.log('   → Conectando a PostgreSQL (Docker)...');
    pgClient = new Client(CONFIG.postgres);
    await pgClient.connect();
    console.log('   ✅ PostgreSQL conectado\n');

    // ============================================
    // PASO 2: OBTENER SALAS ÚNICAS DE WORDPRESS
    // ============================================
    console.log('📋 PASO 2: Obteniendo salas de WordPress...\n');

    const [salasWP] = await mysqlConn.execute(`
      SELECT DISTINCT
        meta_value as nombre_sala,
        COUNT(*) as cantidad_peliculas
      FROM wp_postmeta
      WHERE meta_key = 'pantalla_de_estreno'
      AND meta_value != ''
      GROUP BY meta_value
      ORDER BY cantidad_peliculas DESC
    `);

    console.log(`   ✅ Encontradas ${salasWP.length} salas únicas:\n`);
    salasWP.forEach((sala, idx) => {
      console.log(`   ${idx + 1}. "${sala.nombre_sala}" (${sala.cantidad_peliculas} películas)`);
    });

    // ============================================
    // PASO 3: INSERTAR SALAS EN POSTGRESQL
    // ============================================
    console.log('\n\n🏛️  PASO 3: Insertando salas en screening_venues...\n');

    const venueMap = new Map(); // nombre_sala → venue_id en PostgreSQL

    for (const sala of salasWP) {
      const slug = generateSlug(sala.nombre_sala);
      
      try {
        // Verificar si ya existe
        const checkResult = await pgClient.query(
          'SELECT id FROM screening_venues WHERE slug = $1',
          [slug]
        );

        let venueId;

        if (checkResult.rows.length > 0) {
          // Ya existe
          venueId = checkResult.rows[0].id;
          console.log(`   ⏭️  "${sala.nombre_sala}" ya existe (ID: ${venueId})`);
        } else {
          // Insertar nueva sala
          const insertResult = await pgClient.query(
            `INSERT INTO screening_venues 
              (name, slug, type, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING id`,
            [
              sala.nombre_sala,
              slug,
              'CINEMA', // Tipo por defecto
              true
            ]
          );
          venueId = insertResult.rows[0].id;
          console.log(`   ✅ Insertada "${sala.nombre_sala}" (ID: ${venueId})`);
        }

        venueMap.set(sala.nombre_sala, venueId);

      } catch (error) {
        console.error(`   ❌ Error con "${sala.nombre_sala}":`, error.message);
        throw error;
      }
    }

    // ============================================
    // PASO 4: MAPEAR WORDPRESS IDs → POSTGRESQL IDs
    // ============================================
    console.log('\n\n🗺️  PASO 4: Mapeando IDs de películas WordPress → PostgreSQL...\n');

    // Obtener relaciones desde WordPress
    const [relacionesWP] = await mysqlConn.execute(`
      SELECT 
        p.ID as wordpress_id,
        p.post_title,
        pm.meta_value as sala_nombre
      FROM wp_posts p
      JOIN wp_postmeta pm ON p.ID = pm.post_id
      WHERE p.post_type = 'pelicula'
      AND pm.meta_key = 'pantalla_de_estreno'
      AND pm.meta_value != ''
      ORDER BY sala_nombre, p.post_title
    `);

    console.log(`   ℹ️  Total de relaciones a migrar: ${relacionesWP.length}\n`);

    // Mapear WordPress IDs a PostgreSQL IDs + obtener fechas de estreno
    const movieDataMap = new Map(); // wordpress_id → { id, title, releaseDate }

    console.log('   → Buscando películas en PostgreSQL...\n');

    for (const rel of relacionesWP) {
      if (!movieDataMap.has(rel.wordpress_id)) {
        // Buscar por título (el mapeo más confiable según PROJECT_DOCS)
        const result = await pgClient.query(
          `SELECT 
            id, 
            title,
            release_year,
            release_month,
            release_day
          FROM movies 
          WHERE title = $1 
          LIMIT 1`,
          [rel.post_title]
        );

        if (result.rows.length > 0) {
          const movie = result.rows[0];
          
          // Construir fecha de estreno si está disponible
          // Sistema de fechas parciales de CineNacional:
          // - Fecha completa: año-mes-día
          // - Parcial (año-mes): usa día 1 del mes
          // - Parcial (solo año): usa 1 de enero
          let releaseDate = null;
          if (movie.release_year && movie.release_month && movie.release_day) {
            // Fecha completa
            releaseDate = `${movie.release_year}-${String(movie.release_month).padStart(2, '0')}-${String(movie.release_day).padStart(2, '0')}`;
          } else if (movie.release_year && movie.release_month) {
            // Solo año y mes - usar día 1
            releaseDate = `${movie.release_year}-${String(movie.release_month).padStart(2, '0')}-01`;
          } else if (movie.release_year) {
            // Solo año - usar 1 de enero
            releaseDate = `${movie.release_year}-01-01`;
          }
          
          movieDataMap.set(rel.wordpress_id, {
            id: movie.id,
            title: movie.title,
            releaseDate: releaseDate
          });
        } else {
          console.log(`   ⚠️  No se encontró en PostgreSQL: "${rel.post_title}" (WP ID: ${rel.wordpress_id})`);
        }
      }
    }

    console.log(`   ✅ Mapeadas ${movieDataMap.size} películas de ${relacionesWP.length} relaciones\n`);

    // ============================================
    // PASO 5: INSERTAR RELACIONES EN MOVIE_SCREENINGS
    // ============================================
    console.log('\n🎥 PASO 5: Insertando relaciones en movie_screenings...\n');

    let insertadas = 0;
    let yaExistentes = 0;
    let omitidas = 0;
    let sinFecha = 0;

    for (const rel of relacionesWP) {
      const movieData = movieDataMap.get(rel.wordpress_id);
      const venueId = venueMap.get(rel.sala_nombre);

      if (!movieData) {
        omitidas++;
        continue;
      }

      if (!venueId) {
        console.log(`   ❌ Sala no encontrada: "${rel.sala_nombre}"`);
        omitidas++;
        continue;
      }

      try {
        // Verificar si ya existe esta combinación exacta
        const checkResult = await pgClient.query(
          `SELECT id FROM movie_screenings 
           WHERE movie_id = $1 AND venue_id = $2`,
          [movieData.id, venueId]
        );

        if (checkResult.rows.length > 0) {
          yaExistentes++;
          continue;
        }

        // Contabilizar si no tiene fecha
        if (!movieData.releaseDate) {
          sinFecha++;
        }

        // Insertar relación con fecha de estreno y is_premiere = true
        // is_premiere = true porque "pantalla_de_estreno" indica que fue el estreno
        // is_exclusive = false porque no tenemos esa info en WordPress
        await pgClient.query(
          `INSERT INTO movie_screenings 
            (movie_id, venue_id, screening_date, is_premiere, is_exclusive, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            movieData.id,
            venueId,
            movieData.releaseDate, // Fecha de estreno de la película
            true,  // Es estreno
            false  // No necesariamente exclusivo (puede completarse manualmente después)
          ]
        );

        insertadas++;

        if (insertadas % 10 === 0) {
          console.log(`   → ${insertadas} relaciones insertadas...`);
        }

      } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
          yaExistentes++;
        } else {
          console.error(`   ❌ Error insertando "${rel.post_title}":`, error.message);
        }
      }
    }

    // ============================================
    // RESUMEN FINAL
    // ============================================
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN\n');
    console.log(`✅ Salas insertadas/verificadas: ${salasWP.length}`);
    console.log(`✅ Relaciones insertadas: ${insertadas}`);
    console.log(`   - Con fecha de estreno: ${insertadas - sinFecha}`);
    console.log(`   - Sin fecha (NULL): ${sinFecha}`);
    console.log(`⏭️  Ya existentes: ${yaExistentes}`);
    console.log(`⚠️  Omitidas (película no encontrada): ${omitidas}`);
    console.log(`📈 Total procesadas: ${relacionesWP.length}`);
    console.log('='.repeat(60));

    // ============================================
    // QUERIES PARA VERIFICACIÓN
    // ============================================
    console.log('\n\n🔍 VERIFICACIÓN:\n');
    
    const countVenues = await pgClient.query('SELECT COUNT(*) as total FROM screening_venues');
    const countScreenings = await pgClient.query('SELECT COUNT(*) as total FROM movie_screenings');
    
    console.log(`   Total salas en PostgreSQL: ${countVenues.rows[0].total}`);
    console.log(`   Total screenings en PostgreSQL: ${countScreenings.rows[0].total}`);

    // Mostrar algunas relaciones de ejemplo
    console.log('\n   Ejemplos de relaciones insertadas:\n');
    
    const ejemplos = await pgClient.query(`
      SELECT 
        m.title,
        sv.name as venue_name,
        ms.screening_date,
        ms.is_premiere,
        ms.is_exclusive
      FROM movie_screenings ms
      JOIN movies m ON ms.movie_id = m.id
      JOIN screening_venues sv ON ms.venue_id = sv.id
      WHERE ms.is_premiere = true
      ORDER BY ms.screening_date DESC NULLS LAST, m.title
      LIMIT 5
    `);

    ejemplos.rows.forEach((ej, idx) => {
      const fecha = ej.screening_date 
        ? new Date(ej.screening_date).toISOString().split('T')[0]
        : 'Sin fecha';
      console.log(`   ${idx + 1}. "${ej.title}" → ${ej.venue_name} (${fecha})`);
    });

    console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE\n');

  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA MIGRACIÓN:\n');
    console.error(error);
    console.error('\n💡 La migración falló. Verifica:');
    console.error('   1. Que PostgreSQL en Docker esté corriendo (puerto 5433)');
    console.error('   2. Que las credenciales sean correctas');
    console.error('   3. Que las tablas screening_venues y movie_screenings existan');
    console.error('   4. Que MySQL esté corriendo en localhost\n');
    process.exit(1);
  } finally {
    // Cerrar conexiones
    if (mysqlConn) {
      await mysqlConn.end();
      console.log('🔌 Conexión MySQL cerrada');
    }
    if (pgClient) {
      await pgClient.end();
      console.log('🔌 Conexión PostgreSQL cerrada');
    }
  }
}

// ============================================
// FUNCIÓN AUXILIAR: LISTAR SALAS Y PELÍCULAS
// ============================================
async function listarDatosMigrados() {
  const pgClient = new Client(CONFIG.postgres);
  
  try {
    await pgClient.connect();
    
    console.log('\n📋 DATOS MIGRADOS:\n');
    console.log('='.repeat(60));
    
    // Listar salas
    const salas = await pgClient.query(`
      SELECT 
        id,
        name,
        slug,
        type,
        (SELECT COUNT(*) FROM movie_screenings WHERE venue_id = sv.id) as peliculas_count
      FROM screening_venues sv
      WHERE name IN (
        SELECT DISTINCT name FROM screening_venues 
        WHERE slug LIKE '%malba%' 
           OR slug LIKE '%lugones%' 
           OR slug LIKE '%san-martin%'
           OR slug LIKE '%25-de-mayo%'
      )
      ORDER BY peliculas_count DESC
    `);
    
    console.log('\n🏛️  SALAS MIGRADAS:\n');
    salas.rows.forEach((sala, idx) => {
      console.log(`${idx + 1}. ${sala.name}`);
      console.log(`   ID: ${sala.id} | Slug: ${sala.slug} | Tipo: ${sala.type}`);
      console.log(`   Películas: ${sala.peliculas_count}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pgClient.end();
  }
}

// ============================================
// EJECUTAR
// ============================================

const command = process.argv[2];

if (command === 'listar') {
  listarDatosMigrados()
    .then(() => console.log('✅ Listado completado'))
    .catch(console.error);
} else {
  migratePantallasEstreno()
    .then(() => {
      console.log('💾 Puedes ejecutar "node este-script.js listar" para ver los datos migrados\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migración fallida:', error);
      process.exit(1);
    });
}