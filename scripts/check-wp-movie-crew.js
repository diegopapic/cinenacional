// scripts/check-wp-movie-crew.js
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function checkMovieCrew() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wordpress_cine'
  });

  try {
    // Buscar la película "Tiempo de revancha"
    const [movies] = await connection.execute(`
      SELECT ID, post_title 
      FROM wp_posts 
      WHERE post_type = 'pelicula' 
      AND post_title LIKE '%Tiempo de revancha%'
      LIMIT 5
    `);

    console.log('🎬 Películas encontradas:');
    movies.forEach(m => console.log(`  ID: ${m.ID} - ${m.post_title}`));

    if (movies.length === 0) {
      console.log('No se encontró la película');
      return;
    }

    const movieId = movies[0].ID;
    console.log(`\n📋 Analizando crew de "${movies[0].post_title}" (ID: ${movieId}):\n`);

    // Campos de crew
    const crewFields = [
      'ficha_tecnica_direccion',
      'ficha_tecnica_produccion',
      'ficha_tecnica_guion',
      'ficha_tecnica_fotografia',
      'ficha_tecnica_montaje',
      'ficha_tecnica_musica',
      'ficha_tecnica_sonido',
      'ficha_tecnica_arte',
      'ficha_tecnica_vestuario',
      'ficha_tecnica_maquillaje',
      'ficha_tecnica_camara',
      'ficha_tecnica_asistente_direccion',
      'ficha_tecnica_efectos'
    ];

    // Ver cuántas personas hay en cada campo
    for (const field of crewFields) {
      const [count] = await connection.execute(`
        SELECT meta_value 
        FROM wp_postmeta 
        WHERE post_id = ? 
        AND meta_key = ?
      `, [movieId, field]);

      if (count[0]?.meta_value && count[0].meta_value !== '0') {
        console.log(`${field}: ${count[0].meta_value} personas`);
        
        // Mostrar las primeras 3 personas de cada campo
        const numPersons = parseInt(count[0].meta_value);
        for (let i = 0; i < Math.min(3, numPersons); i++) {
          const [personData] = await connection.execute(`
            SELECT 
              (SELECT meta_value FROM wp_postmeta WHERE post_id = ? AND meta_key = ?) as persona,
              (SELECT meta_value FROM wp_postmeta WHERE post_id = ? AND meta_key = ?) as rol
          `, [
            movieId, `${field}_${i}_persona`,
            movieId, `${field}_${i}_rol`
          ]);
          
          if (personData[0]?.persona) {
            console.log(`  [${i}] Persona: ${personData[0].persona?.substring(0, 50)}, Rol: ${personData[0].rol}`);
          }
        }
      }
    }

    // También verificar campos _import
    console.log('\n🔍 Verificando campos _import:');
    for (const field of crewFields) {
      const [count] = await connection.execute(`
        SELECT meta_value 
        FROM wp_postmeta 
        WHERE post_id = ? 
        AND meta_key = ?
      `, [movieId, `${field}_import`]);

      if (count[0]?.meta_value && count[0].meta_value !== '0') {
        console.log(`${field}_import: ${count[0].meta_value} personas`);
      }
    }

    // Ver todos los meta_keys relacionados con crew
    console.log('\n📊 Todos los campos de crew encontrados:');
    const [allCrewFields] = await connection.execute(`
      SELECT DISTINCT meta_key
      FROM wp_postmeta
      WHERE post_id = ?
      AND (
        meta_key LIKE 'ficha_tecnica_%'
        OR meta_key LIKE '%crew%'
        OR meta_key LIKE '%equipo%'
      )
      ORDER BY meta_key
      LIMIT 50
    `, [movieId]);

    allCrewFields.forEach(f => console.log(`  - ${f.meta_key}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkMovieCrew();